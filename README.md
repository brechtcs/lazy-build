# Glob the Builder

A GNU Make and Gulp crossover, using `pull-stream` in the engine room.

## Example

```js
// build.js

var Build = require('glob-the-builder')
var glob = require('pull-glob')
var marked = require('marked')
var pull = require('pull-stream')

var build = Build.dest('public')

build.add('*.html', function html (params) {
  var name = params[0]
  var encoding = 'utf8'
  
  return pull(
    glob(`src/${name}.md`),
    pull.asyncMap(fs.readFile),
    pull.map(buf => buf.toString(encoding)),
    pull.map(marked),
    pull.map(html => {
      return {
        path: `${name}.html`,
        contents: html,
        enc: encoding
      }
    })
  )
})

build.command()
```

With this build script, the command `node build.js --all` will generate a html file in the `public` folder for all markdown files found in `src`. Running `node build.js new-post.html` will only build `src/new-post.md`, if it exists. Using the `--clean` flag on either command will delete all generated files before rebuilding. Because of the way we define targets, files not recognized by Glob the Builder will be left untouched.

## License

Apache-2.0