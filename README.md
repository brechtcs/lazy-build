# lazy-build

A lazy build system.

- Uses the "code over configuration" approach introduced by Gulp.
- Applies it to clearly defined build targets as with GNU Make.
- Decides which files to build using simple glob patterns.

## Getting started

### Basic usage

Let's first create a single file programmatically. This is a basic build configuration that does just that:

```js
// build.js

var Build = require('lazy-build')
var cli = require('lazy-build/cli')

var build = Build.dest('target'))

build.add('test.json', function (params) {
  return this.write({
    path: params.target,
    contents: JSON.stringify({
      type: 'random',
      data: true
    })
  })
})

cli(build)
```

If you now run `node build.js test.json` or `node build.js --all`, the requested file will be created at `target/test.json`.

### Multiple files

You can also define a single target to build multiple files, using glob patterns. Here's an example:

```js
// build.js

var Build = require('lazy-build')
var cli = require('lazy-build/cli')

var build = Build.dest('target'))

build.add('*.json', async function (params) {
  await this.prune()

  var data = [
    { dit: 32, dat: true },
    { dit: 0, dat: true},
    { dit: 501, dat: false}
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
```

There's a couple of commands you can run now:

- `node build.js --all` or `node build.js *.json` will create files for all three data points: `target/1.json`, `target/2.json`, and `target/3.json`.
- You can (re)build any file separately too, for example `node build.js 2.json`. The other files will remain untouched.
- `node build.js --clean` deletes all the files matching `target/*.json`. This can be combined with `--all` or another target to rebuild things from scratch.

Now let's assume you change your dataset, removing the last item. This is where the `await this.prune()` call goes to work.

- `node build.js --prune 3.json` will now delete the file `target/3.json`, because the corresponding data point wasn't found. The other files are left untouched.
- `node build.js --prune *.json` on the other hand deletes `target/3.json`, and rebuilds `target/1.json` and `target/2.json` as well.

### From filesystem

There is no builtin way to read files from `lazy-build`. Just using Node's `fs` module directly might suffice in a lot of cases. If you need something more comprehensive, consider using `[vfile](https://github.com/vfile/vfile)`. Vfiles are supported in `lazy-build` as first class citizens:

```js
var Build = require('lazy-build')
var cli = require('lazy-build/cli')
var doc = require('rehype-document')
var fg = require('fast-glob')
var format = require('rehype-format')
var rehype = require('remark-rehype')
var remark = require('remark-parse')
var stringify = require('rehype-stringify')
var unified = require('unified')
var vfile = require('to-vfile')

var build = Build.dest('target')

build.add('*.html', async function (params) {
  await this.prune()

  var page = params.wildcards[0]
  var sources = fg.stream(`src/${page}.md`)

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

    await this.write(file)
  }
})

cli(build)
```

The same goes for the Vinyl objects used by Gulp. They too can be handed to `this.write` without adaptation. This makes it possible to reuse your Gulp workflows with only small adjustments. Take for example this typical Less-to-CSS pipeline:

```js
var Build = require('lazy-build')
var autoprefixer = require('gulp-autoprefixer')
var cli = require('lazy-build/cli')
var cssnano = require('gulp-cssnano')
var less = require('gulp-less')
var gulp = require('vinyl-fs')

var build = Build.dest('target')

build.add('*.css', async function (params) {
  var name = params.wildcards[0]
  var pipeline = gulp.src(`src/${name}.less`))
    .pipe(less())
    .pipe(autoprefixer())
    .pipe(cssnano())

  for await (var file of pipeline) {
    await this.write(file)
  }
})

cli(build)
```

There's two main changes compared to a standard Gulp stream:

1. We've replaced `gulp.dest` with an asynchronous iteration calling `this.write`. This ensures that only the requested CSS files are written to the filesystem.
2. In `gulp.src` we're using `params.wildcards[0]` instead of a regular glob pattern. This makes building individual CSS files more efficient.

## License

Apache-2.0
