var Build = require('../../')
var cli = require('../../cli')
var csv = require('csv-parse/lib/sync')
var fs = require('fs')
var path = require('path')

var build = Build.dest(path.join(__dirname, 'target'))

build.add('*.json', async function (params) {
  await this.prune()

  var data = fs.readFileSync(path.join(__dirname, 'data.csv'), 'utf8')
  var lines = csv(data, { columns: true })

  var targets = lines.map((line, i) => {
    var number = i + 1

    return this.write({
      path: number + '.json',
      contents: JSON.stringify(line, null, 2)
    })
  })

  return Promise.all(targets)
})

cli(build)
