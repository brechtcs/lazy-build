var assert = require('assert')
var box = require('callbox')
var errors = require('./errors')
var match = require('./match')
var maybe = require('call-me-maybe')
var path = require('path')
var prune = require('./prune')
var write = require('./write')

class TargetContext {
  constructor (build, target, pattern, opts) {
    this.build = build
    this.path = target
    this.pattern = path.join(build.dest, pattern)
    this.wildcards = match.capture(target, pattern)
    this.opts = opts
  }

  prune (cb) {
    if (!this.build.isPrune) return
    if (this.build.strictMode) assertCb(this.path, cb, this.opts)

    var promise = box(done => {
      prune(this.build.dest, [this.pattern], done)
    })

    return maybe(cb, promise)
  }

  write (file, cb) {
    if (this.build.strictMode) assertCb(this.path, cb, this.opts)
    assert.strictEqual(typeof file, 'object', errors.invalidFile('target.write'))
    assert.strictEqual(typeof file.path, 'string', errors.invalidFilepath('target.write'))
    assert.ok(file.contents, errors.noContents(file))

    var promise = box(done => {
      file.path = file.relative
        ? path.join(this.build.dest, file.relative)
        : path.join(this.build.dest, file.path)

      var isMatch = match.verify(file.path, this.pattern)

      if (this.build.strictMode) {
        var resolve = (path) => path.replace(this.build.dest + '/', '')
        assert.ok(isMatch, errors.noMatch('target.write', resolve(file.path), resolve(this.pattern)))
      }
      if (!isMatch) {
        return done()
      }
      write(file, done)
    })

    return maybe(cb, promise)
  }
}

function assertCb (target, cb, opts) {
  assert.strictEqual(!!cb, !!opts.useCallback, errors.useCallback(target))
}

module.exports = TargetContext
