var fs = require('fs')
var mkdir = require('mkdirp')
var path = require('path')
var pump = require('pump')

module.exports = function (file, cb) {
  var encoding = file.enc || file.encoding
  mkdir(path.dirname(file.path), err => {
    if (err) return cb(err)
    if (typeof file.contents.pipe === 'function') {
      pump([file.contents, fs.createWriteStream(file.path, encoding)], cb)
    } else {
      fs.writeFile(file.path, file.contents, encoding, cb)
    }
  })
}
