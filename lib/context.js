var assert = require('assert')
var box = require('callbox')
var errors = require('./errors')
var match = require('./match')
var maybe = require('call-me-maybe')
var rm = require('dat-rm')
var write = require('./write')

class TargetContext {
  constructor (build, target, pattern, opts) {
    this.build = build
    this.path = target
    this.pattern = pattern
    this.wildcards = match.capture(target, pattern)
    this.opts = opts
  }

  prune (cb) {
    if (!this.build.isPrune) return
    if (this.build.strictMode) assertCb(this.path, cb, this.opts)

    return rm(this.build.dest, this.pattern, {
      prune: true
    }, cb)
  }

  write (file, cb) {
    if (this.build.strictMode) assertCb(this.path, cb, this.opts)
    assert.strictEqual(typeof file, 'object', errors.invalidFile('target.write'))
    assert.strictEqual(typeof file.path, 'string', errors.invalidFilepath('target.write'))
    assert.ok(file.contents, errors.noContents(file))

    var promise = box(done => {
      file.path = file.relative || file.path
      var isMatch = match.verify(file.path, this.pattern)

      if (this.build.strictMode) {
        assert.ok(isMatch, errors.noMatch('target.write', file.path, this.pattern))
      }

      if (isMatch) write(this.build.dest, file, done)
      else done()
    })

    return maybe(cb, promise)
  }
}

function assertCb (target, cb, opts) {
  assert.strictEqual(!!cb, !!opts.useCallback, errors.useCallback(target))
}

module.exports = TargetContext
