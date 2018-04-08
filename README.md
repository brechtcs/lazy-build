# Glob the Builder

A GNU Make and Gulp crossover, using `pull-stream` in the engine room.

## Example

```js
// build.js

var Build = require('glob-the-builder')
var marked = require('marked')
var path = require('path')
var pull = require('pull-stream')
var transform = require('prop-transform')
var vinyl = require('pull-vinyl')

var build = Build.dest('public')

build.add('*.html', function html (params) {
  var name = params[0]
  var encoding = 'utf8'

  return pull(
    vinyl.src(`src/${name}.md`),
    pull.map(transform('enc', () => encoding))
    pull.map(transform('contents', buf => buf.toString(encoding))),
    pull.map(transform('contents', marked)),
    pull.map(transform('path', src => {
      var parsed = path.parse(src)
      return parsed.name + '.html'
    }))
  )
})

build.command()
```

With this build script, the command `node build.js --all` will generate a html file in the `public` folder for all markdown files found in `src`. Running `node build.js new-post.html` will only convert `src/new-post.md`, if it exists. Using the `--clean` flag on either command will delete all generated files before rebuilding. Because of the way we define targets, files not recognized by Glob the Builder will be left untouched.

## License

Apache-2.0
