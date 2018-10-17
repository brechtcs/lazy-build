var path = require('path')
var rm = require('rimraf')
var rmEmpty = require('delete-empty')

module.exports = function (dir, pattern, cb) {
  rm(path.join(dir, pattern), err => {
    if (err) return cb(err)
    rmEmpty(dir, err => {
      if (err) cb(err)
      else cb()
    })
  })
}
