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

build.add('test.json', function (target) {
  return target.write({
    path: target.path,
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

build.add('*.json', async function (target) {
  await target.prune()

  var data = [
    { dit: 32, dat: true },
    { dit: 0, dat: true},
    { dit: 501, dat: false}
  ]

  var targets = data.map((item, i) => {
    var number = i + 1

    return target.write({
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

Now let's assume you change your dataset, removing the last item. This is where the `await target.prune()` call goes to work.

- `node build.js --prune 3.json` will now delete the file `target/3.json`, because the corresponding data point wasn't found. The other files are left untouched.
- `node build.js --prune *.json` on the other hand deletes `target/3.json`, and rebuilds `target/1.json` and `target/2.json` as well.

### From the file system

There is no builtin way to read files from `lazy-build`. Just using Node's `fs` module directly might suffice in a lot of cases. Sometimes you may need something more comprehensive though.

#### Vfile

One excellent option is to dive into the `vfile` ecosystem. [Vfiles](https://github.com/vfile/vfile) are supported in `lazy-build` as first class citizens, meaning they can be passed to `target.write` without adaption. This example uses `to-vfile` to read some markdown files and then transforms them to HTML using `unified` plugins:

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

build.add('*.html', async function (target) {
  await target.prune()

  var page = target.wildcards[0]
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

    await target.write(file)
  }
})

cli(build)
```

#### Gulp

The same goes for the [Vinyl](https://github.com/gulpjs/vinyl) objects used by Gulp. They too can be handed to `target.write` without adaptation. This makes it possible to reuse Gulp workflows with only small adjustments. Take for example this typical Less-to-CSS pipeline:

```js
var Build = require('lazy-build')
var autoprefixer = require('gulp-autoprefixer')
var cli = require('lazy-build/cli')
var cssnano = require('gulp-cssnano')
var less = require('gulp-less')
var gulp = require('vinyl-fs')

var build = Build.dest('target')

build.add('*.css', async function (target) {
  await target.prune()

  var name = target.wildcards[0]
  var pipeline = gulp.src(`src/${name}.less`))
    .pipe(less())
    .pipe(autoprefixer())
    .pipe(cssnano())

  for await (var file of pipeline) {
    await target.write(file)
  }
})

cli(build)
```

There's two main changes compared to a standard Gulp stream:

1. We've replaced `gulp.dest` with an asynchronous iteration calling `target.write`. This ensures that only the requested CSS files are written to the file system.
2. In `gulp.src` we're using `target.wildcards[0]` instead of a regular glob pattern. This makes building individual CSS files more efficient.

### Remote sources

Sometimes we might want to include some remote resources in our build. Content from a headless CMS for example, or data from a REST API. Here's a very basic example to get started:

```js
var Build = require('lazy-build')
var cli = require('lazy-build/cli')
var got = require('got')

var build = Build.dest('target')

build.add('example.html', async function (target) {
  try {
    var res = await got('http://example.com')
    if (res.statusCode === 410) await target.prune()
    if (res.statusCode !== 200) return

    await target.write({
      path: target.path,
      contents: res.body
    })
  } catch (err) {
    console.warn('Failed to fetch remote version of example.html')
  }
})

cli(build)
```

This example also shows why it's necessary to call `target.prune` manually. Here we first try to fetch the resource, and then only delete the old version if the server responds with the HTTP status "410 Gone". Then if the status code is anything else than 200, we don't write anything, leaving the old version in place. This makes our build process more resilient against downtime of external services, or just allows us to continue our work when offline.

### More examples

All the examples above are available in the `examples` folder of this repository, as well as some other interesting use cases. If you have some alternative ideas of your own, PRs are always welcome!

## License

Apache-2.0
