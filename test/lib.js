var Build = require('../')
var fg = require('fast-glob')
var fs = require('fs')
var mock = require('mock-fs')
var path = require('path')
var test = require('tape')

function exists (file) {
  return fs.existsSync(path.join('target', file))
}

function read (file) {
  return fs.readFileSync(path.join('target', file), 'utf8')
}

test('add, has & resolve', function (t) {
  mock()

  var build = Build.dest('target')
  build.add('*.txt', function () {})

  t.ok(build.targets['*.txt'].fn)
  t.ok(build.targets['*.txt'].opts)
  t.ok(exists('.gitignore'))

  t.ok(build.has('*.txt'))
  t.ok(build.has('any.txt'))
  t.notOk(build.has('any.md'))

  t.strictEqual(build.resolve('target/*.txt'), '*.txt')
  t.strictEqual(build.resolve('target/any.txt'), 'any.txt')
  t.notOk(build.resolve('target/any.md'))

  process.nextTick(() => {
    t.strictEqual(read('.gitignore'), '*.txt\n')
    t.end()
  })
})

test('make & clean', async function (t) {
  mock({
    'src/first.txt': 'first',
    'src/second.txt': 'second',
    'target/leftover.txt': 'stuff'
  })

  var build = Build.dest('target', {
    isPrune: true
  })

  build.add('*.txt', async function (params) {
    await this.prune()

    var name = params.wildcards[0]
    var sources = await fg(path.join('src', name + '.txt'))

    var targets = sources.map(src => {
      var content = fs.readFileSync(src, 'utf8')

      return this.write({
        path: path.basename(src),
        contents: content,
        enc: 'utf8'
      })
    })

    return Promise.all(targets)
  })

  await build.make('first.txt')
  t.ok(exists('leftover.txt'))
  t.ok(exists('first.txt'))
  t.strictEqual(read('first.txt'), 'first')

  await build.make('second.txt')
  t.ok(exists('leftover.txt'))
  t.ok(exists('first.txt'))
  t.ok(exists('second.txt'))
  t.strictEqual(read('second.txt'), 'second')

  await build.make('*.txt')
  t.notOk(exists('leftover.txt'))
  t.ok(exists('first.txt'))
  t.ok(exists('second.txt'))

  await build.clean()
  t.notOk(exists('first.txt'))
  t.notOk(exists('second.txt'))
  t.end()
})

test('errors', async function (t) {
  mock()

  var err
  var build = Build.dest('target')
  var fail = async function (target) {
    try {
      await build.make(target)
      return null
    } catch (err) {
      return err
    }
  }

  // No file created for target
  build.add('*.png', function () {
    fs.writeFileSync('target/other.png', Buffer.alloc(8))
  })

  err = await fail('image.png')
  t.ok(err)
  t.ok(err.message.includes('No files were generated for pattern'))
  t.end()
})
