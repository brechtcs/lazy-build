var Build = require('../../')
var cli = require('../../cli')
var got = require('got')
var path = require('path')

var build = Build.dest(path.join(__dirname, '/target'))

build.add('example.html', async function (params) {
  try {
    var res = await got('http://localhost:57455')
    if (res.statusCode === 410) await this.prune()
    if (res.statusCode !== 200) return

    await this.write({
      path: params.target,
      contents: res.body
    })
  } catch (err) {
    console.warn('Failed to fetch remote version of example.html')
  }
})

cli(build)
