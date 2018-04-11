var Build = require('./')
var cssnano = require('cssnano')
var group = require('pull-group')
var marked = require('marked')
var pull = require('pull-stream')
var postcss = require('gulp-postcss')
var toPull = require('stream-to-pull-stream')
var transform = require('prop-transform')
var vinyl = require('pull-vinyl')

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

build.add('*.css', function styles (params) {
  var plugins = [cssnano]

  return pull(
    vinyl.src(`test/${params[0]}.css`),
    toPull.duplex(postcss(plugins)),
    build.target(src => src.base),
    build.write()
  )
})

build.add('dat.json', async function manifest () {
  var manifest = {
    url: 'dat://79f4eb8409172d6f1482044245c286e700af0c45437d191d99183743d0b91937/',
    title: 'distilled.pm',
    description: 'Distilled Pamphlets & Archives'
  }

  return build.write({
    path: 'dat.json',
    contents: JSON.stringify(manifest),
    enc: 'utf8'
  })
})

build.command()
