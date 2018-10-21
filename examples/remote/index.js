var Build = require('../../')
var cli = require('../../cli')
var got = require('got')
var path = require('path')

var build = Build.dest(path.join(__dirname, '/target'))

build.add('example.html', async function (params) {
  try {
    var res = await got('http://localhost:57455')
    if (res.statusCode === 200) await this.prune()
    await this.write({
      path: params.target,
      contents: res.body,
      enc: 'utf8'
    })
  } catch (err) {
    console.error(err)
    console.warn('Something went wrong grabbing a remote version of example.html. If present, a previous version was kept in place')
  }
})

cli(build)
