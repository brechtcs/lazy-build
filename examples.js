var Build = require('./')
var cli = require('./cli')
var cssnano = require('cssnano')
var group = require('pull-group')
var marked = require('marked')
var pull = require('pull-stream')
var postcss = require('gulp-postcss')
var resolve = require('pull-resolve')
var toPull = require('stream-to-pull-stream')
var transform = require('prop-transform')
var vinyl = require('pull-vinyl')

var build = Build.dest('test/target')

build.add('*.html', async function post (params) {
  await this.prune()

  var stream = pull(
    build.read(`test/src/${params[0]}.md`, 'utf8'),
    build.target(src => `${src.name}.html`),
    pull.map(transform('contents', marked)),
    pull.map(file => this.write(file))
  )

  return resolve(stream)
})

build.add('index.html', async function index (params) {
  await this.prune()

  var stream = pull(
    build.read('test/src/*.md', 'utf8'),
    pull.map(transform('contents', marked)),
    group(Infinity),
    pull.map(function (files) {
      return {
        path: 'index.html',
        contents: files.map(file => file.contents).join('\n'),
        enc: 'utf8'
      }
    }),
    pull.map(file => this.write(file))
  )

  return resolve(stream)
})

build.add('*.css', async function styles (params) {
  await this.prune()

  var plugins = [cssnano]

  var stream = pull(
    vinyl.src(`test/src/${params[0]}.css`),
    toPull.duplex(postcss(plugins)),
    build.target(src => src.base),
    pull.map(file => this.write(file))
  )

  return resolve(stream)
})

build.add('dat.json', async function manifest (params) {
  await this.prune()

  var manifest = {
    url: 'dat://79f4eb8409172d6f1482044245c286e700af0c45437d191d99183743d0b91937/',
    title: 'Site name',
    description: 'Site description'
  }

  return this.write({
    path: 'dat.json',
    contents: JSON.stringify(manifest),
    enc: 'utf8'
  })
})

build.add('drafts/*.html', async function drafts (params) {
  await this.prune()

  var drafts = Promise.resolve([
    {name: 'first-draft', body: 'some post'},
    {name: 'second-draft', body: 'another post'}
  ])

  var stream = pull(
    pull.values(await drafts),
    pull.map(draft => {
      return {
        path: `drafts/${draft.name}.html`,
        contents: marked(draft.body),
        enc: 'utf8'
      }
    }),
    pull.map(file => this.write(file))
  )

  return resolve(stream)
})

cli(build)
