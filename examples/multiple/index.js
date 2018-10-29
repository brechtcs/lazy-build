var Build = require('../../')
var cli = require('../../cli')
var csv = require('csv-parse/lib/sync')
var fg = require('fast-glob')
var fs = require('fs')
var path = require('path')

var build = Build.dest(path.join(__dirname, 'target'))

build.add('*.json', async function (params) {
  await this.prune()

  var post = params.wildcards[0]
  var files = await fg(path.join(__dirname, 'src', post + '.csv'))

  var targets = files.map(file => {
    var content = fs.readFileSync(file, 'utf8')
    var data = csv(content, { columns: true })
    var name = path.basename(file, '.csv')

    return this.write({
      path: name + '.json',
      contents: JSON.stringify(data, null, 2),
      enc: 'utf8'
    })
  })

  return Promise.all(targets)
})

cli(build)
