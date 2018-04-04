var Build = require('./')
var fs = require('fs')
var glob = require('pull-glob')
var group = require('pull-group')
var marked = require('marked')
var path = require('path')
var pull = require('pull-stream')

var site = Build.dest('test/target')
site.add('index.html', index)
site.add('*.html', post)
site.command(console.error)

/**
 * Recipes:
 */
function index () {
  return pull(
    glob('test/*.md'),
    pull.asyncMap(function (src, cb) {
      fs.readFile(src, 'utf8', cb)
    }),
    pull.map(marked),
    group(Infinity),
    pull.map(function (files) {
      return {
        path: 'index.html',
        contents: files.join('\n'),
        enc: 'utf8'
      }
    })
  )
}

function post (params) {
  return pull(
    glob('test/' + params[0] + '.md'),
    pull.asyncMap(function (src, cb) {
      var file = path.parse(src)
      fs.readFile(src, 'utf8', function (err, content) {
        if (err) {
          return cb(err)
        }
        cb(null, {
          path: file.name + '.html',
          contents: marked(content),
          enc: 'utf8'
        })
      })
    })
  )
}
