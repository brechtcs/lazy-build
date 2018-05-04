var fs = require('fs')

module.exports = function (path, enc, cb) {
  fs.readFile(path, enc, (err, contents) => {
    if (err) {
      if (err.code === 'EISDIR') {
        return cb(null, {
          path: path,
          dir: true
        })
      }
      return cb(err)
    }
    var file = {
      path: path,
      contents: contents
    }
    if (enc) {
      file.enc = enc
    }
    cb(null, file)
  })
}
