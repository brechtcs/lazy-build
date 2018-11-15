var Build = require('../../')
var cli = require('../../cli')
var browserify = require('browserify')
var path = require('path')

var build = new Build(path.join(__dirname, '/target'))

build.add('app.js', function (target) {
  var bs = browserify(path.join(__dirname, 'src/app.js'))

  return target.write({
    path: target.path,
    contents: bs.bundle()
  })
})

cli(build)
