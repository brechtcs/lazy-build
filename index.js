var assert = require('assert')
var fs = require('fs')
var mkdir = require('mkdirp')
var mm = require('micromatch')
var path = require('path')
var prune = require('./lib/prune')
var write = require('./lib/write')

class Build {
  static dest (dir) {
    return new this(dir)
  }

  constructor (dir, opts) {
    mkdir.sync(dir)

    this.targets = {}
    this.dir = dir
    this.gitignore = fs.createWriteStream(path.join(dir, '.gitignore'), 'utf8')
    this.opts = opts
  }

  add (target, fn) {
    assert.ok(typeof target === 'string', 'Invalid target: ' + target)
    assert.ok(typeof fn === 'function', 'Invalid target handler for ' + target)
    this.targets[target] = fn
    this.gitignore.write(target + '\n')
  }

  make (patterns, cb) {
    assert.notEqual(this.isClean, this.isMake, 'Please choose one main Build type: either `isMake` or `isClean`')

    if (!Array.isArray(patterns)) {
      patterns = [patterns]
    }
    patterns.forEach(pattern => {
      if (this.targets[pattern]) {
        make.call(this, pattern, pattern, cb)
        if (this.isAll) return
      }
      for (var target in this.targets) {
        if (target === pattern) continue
        if (mm.isMatch(pattern, target) || mm.isMatch(target, pattern)) {
          make.call(this, pattern, target, cb)
          if (this.isAll) return
        }
      }
    })
  }

  set opts (opts) {
    opts = opts || {}

    this.isAll = opts.isAll || false
    this.isClean = opts.isClean || false
    this.isMake = opts.isMake || false
    this.isPrune = opts.isPrune || false
    this.noScan = opts.noScan || false
  }
}

function createPrune (pattern) {
  return function () {
    if (!this.isClean && !this.isPrune) return

    return new Promise((resolve, reject) => {
      prune(this.dir, pattern, err => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
}

function createWrite (pattern) {
  return function (file) {
    if (!this.isMake) return

    assert.equal(typeof file, 'object', 'file descriptor must be valid object')
    assert.equal(typeof file.path, 'string', 'file path must be a string')
    assert.ok(mm.isMatch(file.path, pattern), 'file path ' + file.path + ' does not match target glob ' + pattern)
    assert.ok(file.contents, 'file needs contents to be written')

    return new Promise((resolve, reject) => {
      file.path = path.join(this.dir, file.path)
      write(file, err => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
}

function make (pattern, target, cb) {
  var params = mm.capture(target, pattern) || mm.capture(target, target)
  var source = this.targets[target].call({
    prune: createPrune(this.isAll ? target : pattern).bind(this),
    write: createWrite(pattern).bind(this)
  }, params)

  if (source && typeof source.then === 'function') {
    source.then(() => {
      scan.call(this, target, cb)
    }).catch(cb)
  } else {
    scan.call(this, target, cb)
  }
}

function scan (target, cb) {
  if (this.noScan) return cb()
  cb()
}

module.exports = Build
