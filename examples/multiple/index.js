var Build = require('../../')
var cli = require('../../cli')
var path = require('path')

var build = Build.dest(path.join(__dirname, 'target'))

build.add('*.json', async function (params) {
  await this.prune()

  var data = [
    { dit: 32, dat: true },
    { dit: 0, dat: true },
    { dit: 501, dat: false }
  ]

  var targets = data.map((item, i) => {
    var number = i + 1

    return this.write({
      path: number + '.json',
      contents: JSON.stringify(item, null, 2)
    })
  })

  return Promise.all(targets)
})

cli(build)
