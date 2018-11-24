# lazy-build

A lazy build system that...

- Follows the "code over configuration" approach introduced by Gulp.
- Applies it to clearly defined build targets as with GNU Make.
- Decides which files to build using simple glob patterns.
- Supports virtual file systems, like [`DatArchive`](https://beakerbrowser.com/docs/apis/dat) or [`hyperdrive`](https://github.com/mafintosh/hyperdrive).

## Getting started

### Basic usage

Let's first create a single file programmatically. This is a basic build configuration that does just that:

```js
// build.js

var Build = require('lazy-build')
var cli = require('lazy-build/cli')

var build = new Build('target'))

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

var build = new Build('target'))

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

var build = new Build('target')

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

var build = new Build('target')

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

var build = new Build('target')

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

## API

### var build = new Build(destination, options)

Create a new `lazy-build` instance.

#### destination

Type: `string` or `object` (required)

Destination folder for the build files.

If a path string is passed in, it will be used to create a `scoped-fs` instance.

If an object is used, it should implement all asynchronous `fs` methods, like for example `dat-node` or `hyperdrive`.

#### options.isAll

Type: `boolean` (default: `false`)

Determines whether all targets should be built on any run.

#### options.isPrune

Type: `boolean` (default: `false`)

Determines whether old files for targets should be pruned before rebuilding.

#### options.strictMode

Type: `boolean` (default: `false`)

Determines whether errors should be thrown on potential user errors.

### build.add(path, handler [, options])

Add a new handler for building file(s).

#### path

Type: `string` (required)

Glob pattern matching the file(s) to be built by this handler.

#### handler(target [, callback])

Type: `function` (required)

Method containing the logic to create the file(s) matching `path`.

##### target.path

Type: `string`

The path originally passed into `build.add`.

##### target.wildcards

Type: `Array<string>`

A list of values to resolve the wildcards in the `path` glob pattern.

##### target.prune([callback])

Type: `function`

Returns `Promise` if no callback is passed in. Don't use callback unless `options.useCallback === true`. (see below)

Method that prunes existing files matching the `path` glob.

##### target.write(file, [callback])

Type: `function`

Returns `Promise` if no callback is passed in. Don't use callback unless `options.useCallback === true`. (see below)

Method to write a file to the build destination folder. File can be an object of type `Vfile`, `Vinyl`, or just a literal with `path` and `contents` properties set.

##### callback

Type: `function` (optional)

Only use if `options.useCallback === true`. (see below)

#### options.useCallback

Type: `boolean` (default: `false`)

Determines whether callback usage is allowed in the handler function.

### build.clean([callback])

Type: `function`

Returns `Promise` if no callback is passed in.

Deletes all the files in the destination folder matching any of the build targets.

### build.has(pattern)

Type: `function`

Returns `boolean` indicating if a build target is defined for `pattern`.

### build.make(patterns [, callback])

Type: `function`

Returns `Promise` if no callback is passed in.

Build all files matching the requested glob patterns.

#### patterns

Type: `Array<string>` or `string`

Should be a (list of) glob pattern(s) matching the files to be built.

### build.resolve(path)

Type: `function`

Returns `string` representing the path relative to the build destination folder for a given `path` from the local file system.

Throws an error if the requested path is outside the destination folder.

## License

Apache-2.0
