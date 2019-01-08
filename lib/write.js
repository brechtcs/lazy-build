var mkdir = require('mkdirp')
var path = require('path')
var pump = require('pump')

module.exports = function (fs, file, cb) {
  var encoding = file.enc || file.encoding
  mkdir(dirname(file.path), { fs }, err => {
    if (err) return cb(err)
    if (typeof file.contents.pipe === 'function') {
      pump([file.contents, fs.createWriteStream(file.path, encoding)], cb)
    } else {
      fs.writeFile(file.path, file.contents, encoding, cb)
    }
  })
}

function dirname (file) {
  var p = path.dirname(file)
  var abs = /^\//.test(p)
  return abs ? p : '/' + p
}
