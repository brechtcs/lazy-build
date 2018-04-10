var Build = require('./')
var group = require('pull-group')
var marked = require('marked')
var pull = require('pull-stream')
var transform = require('prop-transform')

var build = Build.dest('test/target')

build.add('*.html', function post (params) {
  return pull(
    build.src(`test/${params[0]}.md`, 'utf8'),
    build.target(src => `${src.name}.html`),
    pull.map(transform('contents', marked)),
    build.write()
  )
})

build.add('index.html', function index () {
  return pull(
    build.src('test/*.md', 'utf8'),
    pull.map(transform('contents', marked)),
    group(Infinity),
    pull.map(function (files) {
      return {
        path: 'index.html',
        contents: files.map(file => file.contents).join('\n'),
        enc: 'utf8'
      }
    }),
    build.write()
  )
})

build.command()
