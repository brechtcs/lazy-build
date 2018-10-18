var cp = require('child_process')
var fs = require('fs')
var path = require('path')
var rm = require('rimraf')
var test = require('tape')

test('Basic example', function (t) {
  var example = 'basic'

  clean(example, () => {
    run(example, ['-a'], code => {
      t.equal(code, 0)
      t.ok(exists(example, 'test.json'))

      run(example, ['-ca'], code => {
        t.equal(code, 0)
        t.notOk(exists(example, 'test.json'))
        t.end()
      })
    })
  })
})

/**
 * Helpers
 */
function clean (example, cb) {
  rm(`examples/${example}/target`, cb)
}

function run (example, flags, cb) {
  cp.fork('./examples/' + example, flags).on('close', cb)
}

function exists (example, file) {
  return fs.existsSync(path.join(`examples/${example}/target`, file))
}
