var assert = require('assert')
var fg = require('fast-glob')
var fs = require('fs')
var maybe = require('call-me-maybe')
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

  clean (cb) {
    var promise = new Promise((resolve, reject) => {
      prune(this.dir, Object.keys(this.targets), err => {
        if (err) reject(err)
        else resolve()
      })
    })

    return maybe(cb, promise)
  }

  make (patterns, cb) {
    if (!Array.isArray(patterns)) {
      patterns = [patterns]
    }

    var promise = new Promise((resolve, reject) => {
      function done (err) {
        if (err) reject(err)
        else resolve()
      }

      patterns.forEach(pattern => {
        if (this.targets[pattern]) {
          make.call(this, pattern, pattern, done)
          if (this.isAll) return
        }
        for (var target in this.targets) {
          if (target === pattern) continue
          if (mm.isMatch(pattern, target) || mm.isMatch(target, pattern)) {
            make.call(this, pattern, target, done)
            if (this.isAll) return
          }
        }
      })
    })

    return maybe(cb, promise)
  }

  set opts (opts) {
    opts = opts || {}

    this.isAll = opts.isAll || false
    this.isPrune = opts.isPrune || false
    this.noVerify = opts.noVerify || false
  }
}

function createPrune (pattern) {
  return function () {
    if (!this.isPrune) return

    return new Promise((resolve, reject) => {
      prune(this.dir, [pattern], err => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
}

function createWrite (pattern) {
  return function (file) {
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
  var wildcards = mm.capture(target, pattern) || mm.capture(target, target)
  var task = this.targets[target].call({
    prune: createPrune(this.isAll ? target : pattern).bind(this),
    write: createWrite(pattern).bind(this)
  }, { target, wildcards })

  verify.call(this, task, target, cb)
}

function verify (task, target, cb) {
  if (this.noVerify) return cb()
  if (task === undefined || task === null) task = true
  if (typeof task.then === 'function') {
    return task.then(res => {
      verify.call(this, res, target, cb)
    }).catch(cb)
  }

  fg(path.join(this.dir, target)).then(files => {
    if (files.length) cb()
    else cb(new Error('No files were generated for target ' + target))
  }).catch(cb)
}

module.exports = Build
