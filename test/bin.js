var box = require('callbox')
var cp = require('child_process')
var fs = require('fs')
var http = require('http')
var path = require('path')
var rm = require('rimraf')
var test = require('tape')

test('basic example', async function (t) {
  var code = 0
  var example = 'basic'

  await clean(example)

  code = await run(example)
  t.strictEqual(code, 0)
  t.ok(exists(example, 'test.json'))

  code = await run(example, ['-c'])
  t.strictEqual(code, 0)
  t.notOk(exists(example, 'test.json'))
  t.end()
})

test('multiple example', async function (t) {
  var code = 0
  var example = 'multiple'

  await clean(example)
  code = await run(example, ['--no-strict', '1.json'])
  t.strictEqual(code, 0)
  t.ok(exists(example, '1.json'))
  t.notOk(exists(example, '2.json'))

  await clean(example)
  code = await run(example, ['--no-strict', 'examples/multiple/target/2.json'])
  t.strictEqual(code, 0)
  t.notOk(exists(example, '1.json'))
  t.ok(exists(example, '2.json'))

  await clean(example)
  write(example, 'dummy.json', '')
  t.ok(exists(example, 'dummy.json'))
  code = await run(example, ['--no-strict', '-pa'])
  t.strictEqual(code, 0)
  t.notOk(exists(example, 'dummy.json'))
  t.ok(exists(example, '1.json'))
  t.ok(exists(example, '2.json'))

  code = await run(example, ['--no-strict', '-c'])
  t.strictEqual(code, 0)
  t.notOk(exists(example, '1.json'))
  t.notOk(exists(example, '2.json'))
  t.end()
})

test('remote example', async function (t) {
  var code = 0
  var example = 'remote'

  await clean(example)

  code = await run(example, ['-p'])
  t.strictEqual(code, 1)
  t.notOk(exists(example, 'example.html'))

  var content = '<body>example</body>'
  var server = serve(content, 57455)

  code = await run(example, ['-p'])
  t.strictEqual(code, 0)
  t.ok(exists(example, 'example.html'))

  server.close(async () => {
    code = await run(example, ['-p'])
    t.strictEqual(code, 0)
    t.ok(exists(example, 'example.html'))
    t.strictEqual(read(example, 'example.html'), content)
    t.end()
  })
})

test('browserify example', async function (t) {
  var code = 0
  var example = 'browserify'

  await clean(example)

  code = await run(example)
  t.strictEqual(code, 0)
  t.ok(exists(example, 'app.js'))
  t.end()
})

test('vfile example', async function (t) {
  var code = 0
  var example = 'vfile'

  await clean(example)

  code = await run(example)
  t.strictEqual(code, 0)
  t.ok(exists(example, 'about.html'))
  t.ok(exists(example, 'contact.html'))
  t.ok(exists(example, 'index.html'))
  t.end()
})

test('gulp example', async function (t) {
  var code = 0
  var example = 'gulp'

  await clean(example)

  code = await run(example)
  t.strictEqual(code, 0)
  t.ok(exists(example, 'main.css'))
  t.ok(exists(example, 'theme.css'))
  t.end()
})

/**
 * Helpers
 */
function clean (example) {
  return box(done => rm(`examples/${example}/target/**/*`, done))
}

function run (example, flags) {
  if (!flags) flags = []
  if (!flags.includes('--no-strict')) {
    flags.push('--strict')
  }
  return box(done => {
    cp.fork('./examples/' + example, flags).on('close', code => done(null, code))
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
