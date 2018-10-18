var Build = require('../../')
var cli = require('../../cli')
var fs = require('fs')
var globby = require('globby')
var marked = require('marked')
var path = require('path')

var build = Build.dest(path.join(__dirname, 'target'))

build.add('*.html', async function (params) {
  await this.prune()

  var post = params[0]
  var files = await globby(path.join(__dirname, 'src', post + '.md'))

  var pages = files.map(file => {
    var content = fs.readFileSync(file, 'utf8')
    var name = path.basename(file, '.md')

    return this.write({
      path: name + '.html',
      contents: marked(content),
      enc: 'utf8'
    })
  })

  return Promise.all(pages)
})

cli(build)
