var Build = require('../../')
var cli = require('../../cli')
var fs = require('fs')
var path = require('path')

var build = Build.dest(path.join(__dirname, '/target'))

build.add('sync.txt', function (params) {
  fs.writeFileSync(path.join(build.dir, params.target), 'sync test', 'utf8')
})

build.add('callback.txt', function (params) {
  return when(done => {
    fs.writeFile(path.join(build.dir, params.target), 'callback test', 'utf8', done)
  })
})

function when (fn) {
  return new Promise((resolve, reject) => {
    fn(function (err, res) {
      if (err) reject(err)
      else resolve()
    })
  })
}

cli(build)
