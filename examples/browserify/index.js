var Build = require('../../')
var cli = require('../../cli')
var browserify = require('browserify')
var path = require('path')

var build = Build.dest(path.join(__dirname, '/target'))

build.add('app.js', function (params) {
  var bs = browserify(path.join(__dirname, 'src/app.js'))

  return this.write({
    path: params.target,
    contents: bs.bundle()
  })
})

cli(build)
