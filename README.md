# lazy-build

A lazy build system, combining ideas from GNU Make and Gulp, using `pull-stream` in the engine room.

## Usage

```js
// build.js

var Build = require('lazy-build')
var cli = require('lazy-build/cli')
var marked = require('marked')
var pull = require('lazy-build/pull')
var transform = require('prop-transform')

var build = Build.dest('public')

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

cli(build)
```

With this build script, the command `node build.js --all` will generate a html file in the `public` folder for all markdown files found in `src`. Running `node build.js new-post.html` will only convert `src/new-post.md`, if it exists. Using the `--clean` flag on either command will delete all generated files before rebuilding. Because of the way we define targets, files not recognized by Lazy Build will be left untouched.

### Create files

If you want to create files on the fly, without reading any corresponding source file on the system, just define plain objects with the properties `path`, `contents`, and if necessary `enc` for the encoding.

```js
build.add('dat.json', async function manifest () {
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
```

### Paginate and concatenate

You can easily concatenate (or paginate) multiple files using the [`pull-group`](https://www.npmjs.com/package/pull-group) module and the file object model described in the previous section.

```js
var group = require('pull-group')

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
```

### Await before streaming

It's also possible to await an asynchronous call before starting the stream. In that case you should wrap the steam using [`pull-resolve`](https://www.npmjs.com/package/pull-resolve) before returning it.

```js
var resolve = require('pull-resolve')

build.add('drafts/*.html', async function robots () {
  await this.prune()
  var drafts = await cms.getDrafts()

  var stream = pull(
    pull.values(drafts),
    pull.map(draft => {
      return {
        path: `drafts/${draft.name}.html`,
        contents: marked(draft.body),
        enc: 'utf8'
      }
    }),
    pull.map(file => this.write(file))
    build.write()
  )

  return resolve(stream)
})
```


### Use Gulp plugins

Most Gulp plugins can be used too, using the [`pull-vinyl`](https://www.npmjs.com/package/pull-vinyl) and [`stream-to-pull-stream`](https://www.npmjs.com/package/stream-to-pull-stream) modules.

```js
var cssnano = require('cssnano')
var postcss = require('gulp-postcss')
var toPull = require('stream-to-pull-stream')
var vinyl = require('pull-vinyl')

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
```

## License

Apache-2.0
