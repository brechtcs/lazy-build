var cp = require('child_process')
var fs = require('fs')
var path = require('path')
var test = require('tape')

test('Build examples', function (t) {
  cp.fork('./examples', ['--all', '--clean']).on('close', function (code) {
    t.notOk(code, 'exit code zero')
    t.ok(exists('index.html'), 'index generated')
    t.ok(exists('first.html'), 'first post generated')
    t.ok(exists('second.html'), 'second post generated')
    t.ok(exists('third.html'), 'third post generated')
    t.ok(exists('style.css'), 'stylesheet generated')
    t.ok(exists('dat.json'), 'manifest generated')
    t.ok(exists('posts/2018-04-11.json'), 'first post generated')
    t.ok(exists('posts/2018-04-12.json'), 'second post generated')
    t.end()
  })
})

function exists (file) {
  return fs.existsSync(path.join(__dirname, 'target', file))
}
