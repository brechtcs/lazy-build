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

## License

Apache-2.0
