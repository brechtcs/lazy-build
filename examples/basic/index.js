var Build = require('../../')
var cli = require('../../cli')
var path = require('path')

var build = Build.dest(path.join(__dirname, '/target'))

build.add('test.json', function (target) {
  return target.write({
    path: target.path,
    contents: JSON.stringify({
      type: 'random',
      data: true
    })
  })
})

cli(build)
