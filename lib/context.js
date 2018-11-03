var assert = require('assert')
var box = require('callbox')
var match = require('./match')
var maybe = require('call-me-maybe')
var path = require('path')
var prune = require('./prune')
var write = require('./write')

class TargetContext {
  constructor (build, target, pattern) {
    this.build = build
    this.path = target
    this.pattern = path.join(build.dest, pattern)
    this.wildcards = match.capture(target, pattern)
  }

  prune (cb) {
    if (!this.build.isPrune) return

    var promise = box(done => {
      prune(this.build.dest, [this.pattern], done)
    })

    return maybe(cb, promise)
  }

  write (file, cb) {
    assert.strictEqual(typeof file, 'object', 'file descriptor must be valid object')
    assert.strictEqual(typeof file.path, 'string', 'file path must be a string')
    assert.ok(file.contents, 'file needs contents to be written')

    var promise = box(done => {
      file.path = file.relative
        ? path.join(this.build.dest, file.relative)
        : path.join(this.build.dest, file.path)

      if (!match.verify(file.path, this.pattern)) {
        return done()
      }
      write(file, done)
    })

    return maybe(cb, promise)
  }
}

module.exports = TargetContext
