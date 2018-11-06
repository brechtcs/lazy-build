var Build = require('../../')
var cli = require('../../cli')
var doc = require('rehype-document')
var fg = require('fast-glob')
var format = require('rehype-format')
var rehype = require('remark-rehype')
var remark = require('remark-parse')
var path = require('path')
var stringify = require('rehype-stringify')
var unified = require('unified')
var vfile = require('to-vfile')

var build = Build.dest(path.join(__dirname, 'target'))

build.add('*.html', async function (target) {
  await target.prune()

  var page = target.wildcards[0]
  var sources = fg.stream(path.join(__dirname, 'src', page + '.md'))

  for await (var source of sources) {
    var file = await vfile.read(source)
    file.dirname = ''
    file.extname = '.html'
    file = await unified()
      .use(remark)
      .use(rehype)
      .use(doc)
      .use(format)
      .use(stringify)
      .process(file)

    await target.write(file)
  }
})

cli(build)
