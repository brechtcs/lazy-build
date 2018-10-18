var Build = require('../../')
var cli = require('../../cli')
var path = require('path')

var build = Build.dest(path.join(__dirname, '/target'))

build.add('test.json', async function () {
  var content = {
    some: 'random',
    json: true
  }

  await this.prune()

  return this.write({
    path: 'test.json',
    contents: JSON.stringify(content),
    enc: 'utf8'
  })
})

cli(build)
