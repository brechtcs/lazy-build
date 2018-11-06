var Build = require('../')
var box = require('callbox')
var errors = require('../lib/errors')
var fg = require('fast-glob')
var fs = require('fs')
var path = require('path')
var rm = require('rimraf')
var test = require('tape')

function clean () {
  return box(done => rm('test/target/*', done))
}

function exists (file) {
  return fs.existsSync(path.join('test/target', file))
}

function read (file) {
  return fs.readFileSync(path.join('test/target', file), 'utf8')
}

function write (file, contents) {
  return fs.writeFileSync(path.join('test/target', file), contents, 'utf8')
}

test('add, has & resolve', async function (t) {
  await clean()

  var build = Build.dest('test/target')
  build.add('*.txt', function () {})

  t.ok(build.targets['*.txt'].fn)
  t.ok(build.targets['*.txt'].opts)
  t.ok(exists('.gitignore'))

  t.ok(build.has('*.txt'))
  t.ok(build.has('any.txt'))
  t.notOk(build.has('any.md'))

  t.strictEqual(build.resolve('test/target/*.txt'), '*.txt')
  t.strictEqual(build.resolve('test/target/any.txt'), 'any.txt')

  setTimeout(() => {
    t.strictEqual(read('.gitignore'), '*.txt\n')
    t.end()
  }, 250)
})

test('make & clean', async function (t) {
  await clean()
  write('leftover.txt', '')

  var build = Build.dest('test/target', {
    isPrune: true
  })

  build.add('*.txt', async (target) => {
    await target.prune()

    var name = target.wildcards[0]
    var sources = await fg(path.join('test/src', name + '.txt'))

    var targets = sources.map(src => {
      var content = fs.readFileSync(src, 'utf8')

      return target.write({
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
  t.strictEqual(read('first.txt'), 'first\n')

  await build.make('second.txt')
  t.ok(exists('leftover.txt'))
  t.ok(exists('first.txt'))
  t.ok(exists('second.txt'))
  t.strictEqual(read('second.txt'), 'second\n')

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
  await clean()

  var build = Build.dest('test/target', {
    isPrune: true,
    strictMode: true
  })

  var err, pattern
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
    fs.writeFileSync('test/target/other.png', Buffer.alloc(8))
  })

  pattern = 'image.png'
  err = await fail(pattern)
  t.ok(err)
  t.strictEqual(err.message, errors.noFiles(pattern))

  // Created file doesn't match target
  build.add('*.png', function (target) {
    return target.write({
      path: target.wildcards[0] + '.jpg',
      contents: Buffer.alloc(8)
    })
  })

  err = await fail(pattern)
  t.ok(err)
  t.strictEqual(err.message, errors.noMatch('target.write', 'image.jpg', pattern))

  // Incorrect callback use for `target.prune`
  build.add('image.png', function (target) {
    target.prune(err => console.error(err))
  })

  err = await fail(pattern)
  t.ok(err)
  t.strictEqual(err.message, errors.useCallback(pattern))

  // Incorrect callback use for `target.write`
  build.add('image.png', function (target) {
    var file = {
      path: target.path,
      contents: Buffer.alloc(8)
    }

    target.write(file, err => {
      console.error(err)
    })
  })

  err = await fail(pattern)
  t.ok(err)
  t.strictEqual(err.message, errors.useCallback(pattern))

  // Fail to resolve path outside of destination
  try {
    build.resolve(pattern)
    t.notOk(true)
  } catch (err) {
    t.ok(err)
    t.strictEqual(err.message, errors.outsideDest(pattern))
  }
  t.end()

  await clean()
})
