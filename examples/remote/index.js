var Build = require('../../cli')
var got = require('got')
var path = require('path')

var build = new Build(path.join(__dirname, '/target'))

build.add('example.html', async function (target) {
  try {
    var res = await got('http://localhost:57455')
    if (res.statusCode === 410) await target.prune()
    if (res.statusCode !== 200) return

    await target.write({
      path: target.path,
      contents: res.body
    })
  } catch (err) {
    console.warn('Failed to fetch remote version of example.html')
  }
})

build.make()
