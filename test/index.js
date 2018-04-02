var cp = require('child_process')
var fs = require('fs')
var path = require('path')
var test = require('tape')

test('Build example', function (t) {
  cp.fork('./example', ['--all', '--clean']).on('close', function (code) {
    t.notOk(code, 'exit code zero')
    t.ok(exists('index.html'), 'index generated')
    t.ok(exists('first.html'), 'first post generated')
    t.ok(exists('second.html'), 'second post generated')
    t.ok(exists('third.html'), 'third post generated')
    t.end()
  })
})

function exists (file) {
  return fs.existsSync(path.join(__dirname, 'target', file))
}
