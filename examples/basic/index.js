var Build = require('../../cli')
var path = require('path')

var build = new Build(path.join(__dirname, '/target'))

build.add('test.json', function (target) {
  return target.write({
    path: target.path,
    contents: JSON.stringify({
      type: 'random',
      data: true
    })
  })
})

build.make()
