var Build = require('../../')
var cli = require('../../cli')
var path = require('path')

var build = Build.dest(path.join(__dirname, '/target'))

build.add('test.json', function (params) {
  return this.write({
    path: params.target,
    contents: JSON.stringify({
      type: 'random',
      data: true
    })
  })
})

cli(build)
