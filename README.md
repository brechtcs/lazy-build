# lazy-build

A lazy build system, combining ideas from GNU Make and Gulp, using `pull-stream` in the engine room.

## Usage

```js
// build.js

var Build = require('lazy-build')
var marked = require('marked')
var pull = require('lazy-build/pull')
var transform = require('prop-transform')

var build = Build.dest('public')

build.add('*.html', function html (params) {
  var name = params[0]

  return pull(
    build.src(`src/${name}.md`, 'utf8'),
    build.target(src => `${src.name}.html`),
    pull.map(transform('contents', marked)),
    build.write()
  )
})

build.command()
```

With this build script, the command `node build.js --all` will generate a html file in the `public` folder for all markdown files found in `src`. Running `node build.js new-post.html` will only convert `src/new-post.md`, if it exists. Using the `--clean` flag on either command will delete all generated files before rebuilding. Because of the way we define targets, files not recognized by Glob the Builder will be left untouched.

### Create files

If you want to create files programmatically, without a corresponding source file on the system, just define plain objects with the properties `path`, `contents`, and if necessary `enc` for the encoding.

```js
build.add('dat.json', async function manifest () {
  var manifest = {
    url: 'dat://79f4eb8409172d6f1482044245c286e700af0c45437d191d99183743d0b91937/',
    title: 'Site name',
    description: 'Site description'
  }

  return build.write({
    path: 'dat.json',
    contents: JSON.stringify(manifest),
    enc: 'utf8'
  })
})
```

### Paginate and concatenate

You can easily concatenate (or paginate) multiple files using the `pull-group` module and the file object model described in the previous section.

```js
var group = require('pull-group')

build.add('index.html', function index () {
  return pull(
    build.src('test/src/*.md', 'utf8'),
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
```

### Use Gulp plugins

Most Gulp plugins can be used too, using the `pull-vinyl` and `stream-to-pull-stream` modules.

```js
var cssnano = require('cssnano')
var postcss = require('gulp-postcss')
var toPull = require('stream-to-pull-stream')
var vinyl = require('pull-vinyl')

build.add('*.css', function styles (params) {
  var plugins = [cssnano]

  return pull(
    vinyl.src(`test/src/${params[0]}.css`),
    toPull.duplex(postcss(plugins)),
    build.target(src => src.base),
    build.write()
  )
})
```

## License

Apache-2.0
