var cp = require('child_process')
var fs = require('fs')
var http = require('http')
var path = require('path')
var rm = require('rimraf')
var test = require('tape')

test('Basic example', async function (t) {
  var code = 0
  var example = 'basic'

  await clean(example)

  code = await run(example, ['-a'])
  t.equal(code, 0)
  t.ok(exists(example, 'test.json'))

  code = await run(example, ['-c'])
  t.equal(code, 0)
  t.notOk(exists(example, 'test.json'))
  t.end()
})

test('Multiple example', async function (t) {
  var code = 0
  var example = 'multiple'

  await clean(example)
  code = await run(example, ['first.html'])
  t.equal(code, 0)
  t.ok(exists(example, 'first.html'))
  t.notOk(exists(example, 'second.html'))

  await clean(example)
  code = await run(example, ['examples/multiple/target/second.html'])
  t.equal(code, 0)
  t.notOk(exists(example, 'first.html'))
  t.ok(exists(example, 'second.html'))

  await clean(example)
  write(example, 'dummy.html', '')
  t.ok(exists(example, 'dummy.html'))
  code = await run(example, ['-pa'])
  t.equal(code, 0)
  t.notOk(exists(example, 'dummy.html'))
  t.ok(exists(example, 'first.html'))
  t.ok(exists(example, 'second.html'))

  code = await run(example, ['-c'])
  t.equal(code, 0)
  t.notOk(exists(example, 'first.html'))
  t.notOk(exists(example, 'second.html'))
  t.end()
})

test('Remote example', async function (t) {
  var code = 0
  var example = 'remote'

  await clean(example)

  code = await run(example, ['-ap'])
  t.equal(code, 1)
  t.notOk(exists(example, 'example.html'))

  var content = '<body>example</body>'
  var server = serve(content, 57455)

  code = await run(example, ['-ap'])
  t.equal(code, 0)
  t.ok(exists(example, 'example.html'))

  server.close(async () => {
    code = await run(example, ['-ap'])
    t.equal(code, 0)
    t.ok(exists(example, 'example.html'))
    t.equal(read(example, 'example.html'), content)
    t.end()
  })
})

test('Browserify example', async function (t) {
  var code = 0
  var example = 'browserify'

  await clean(example)

  code = await run(example, ['-a'])
  t.equal(code, 0)
  t.ok(exists(example, 'app.js'))
  t.end()
})

test('Special cases example', async function (t) {
  var code = 0
  var example = 'special'

  await clean(example)

  code = await run(example, ['-a'])
  t.equal(code, 0)
  t.ok(exists(example, 'sync.txt'))
  t.equal(read(example, 'sync.txt'), 'sync test')
  t.ok(exists(example, 'callback.txt'))
  t.equal(read(example, 'callback.txt'), 'callback test')
  t.end()
})

/**
 * Helpers
 */
function clean (example) {
  return new Promise((resolve, reject) => {
    rm(`examples/${example}/target/**/*`, err => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function run (example, flags) {
  return new Promise(resolve => {
    cp.fork('./examples/' + example, flags).on('close', resolve)
  })
}

function exists (example, file) {
  return fs.existsSync(path.join(`examples/${example}/target`, file))
}

function write (example, file, contents) {
  return fs.writeFileSync(path.join(`examples/${example}/target`, file), contents, 'utf8')
}

function read (example, file) {
  return fs.readFileSync(path.join(`examples/${example}/target`, file), 'utf8')
}

function serve (response, port) {
  return http.createServer((req, res) => res.end(response)).listen(port)
}
