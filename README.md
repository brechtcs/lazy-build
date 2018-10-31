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

## License

Apache-2.0
