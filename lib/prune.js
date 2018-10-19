var parallel = require('run-parallel')
var path = require('path')
var rm = require('rimraf')
var rmEmpty = require('delete-empty')

module.exports = function (dir, patterns, cb) {
  var tasks = patterns.map(pattern => {
    return done => rm(path.join(dir, pattern), done)
  })

  parallel(tasks, err => {
    if (err) return cb(err)
    rmEmpty(dir, err => {
      if (err) cb(err)
      else cb()
    })
  })
}
