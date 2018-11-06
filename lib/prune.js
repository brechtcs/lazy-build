var parallel = require('run-parallel')
var rm = require('rimraf')
var rmEmpty = require('delete-empty')

module.exports = function (dir, files, cb) {
  var tasks = files.map(file => {
    return done => rm(file, done)
  })

  parallel(tasks, err => {
    if (err) return cb(err)
    rmEmpty(dir, err => {
      if (err) cb(err)
      else cb()
    })
  })
}
