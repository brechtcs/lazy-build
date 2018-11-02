var assert = require('assert')
var box = require('callbox')
var fg = require('fast-glob')
var fs = require('fs')
var maybe = require('call-me-maybe')
var mkdir = require('mkdirp')
var mm = require('micromatch')
var parallel = require('run-parallel')
var path = require('path')
var prune = require('./lib/prune')
var write = require('./lib/write')

class Build {
  static dest () {
    return new this(...arguments)
  }

  constructor (dest, opts) {
    mkdir.sync(dest)

    this.targets = {}
    this.dest = path.resolve(dest)
    this.gitignore = fs.createWriteStream(path.join(dest, '.gitignore'), 'utf8')
    this.opts = opts
  }

  add (target, fn, opts) {
    opts = opts || {}
    assert.ok(typeof target === 'string', 'Invalid target: ' + target)
    assert.ok(typeof fn === 'function', 'Invalid target handler for ' + target)
    assert.ok(typeof opts === 'object' && !Array.isArray(opts), 'Invalid options Object')

    this.targets[target] = { fn, opts }
    this.gitignore.write(target + '\n')
  }

  clean (cb) {
    var promise = box(done => {
      prune(this.dest, Object.keys(this.targets), done)
    })

    return maybe(cb, promise)
  }

  has (pattern) {
    for (var target in this.targets) {
      if (target === pattern) return true
      if (match(pattern, target)) return true
    }
    return false
  }

  make (patterns, cb) {
    if (!Array.isArray(patterns)) {
      patterns = [patterns]
    }

    var promise = box(done => {
      var tasks = []
      var schedule = (pattern, target) => {
        tasks.push(fn => execute.call(this, pattern, target, fn))
      }

      patterns.forEach(pattern => {
        if (this.targets[pattern]) {
          schedule(pattern, pattern)
          if (this.isAll) return
        }
        for (var target in this.targets) {
          if (target === pattern) continue
          if (match(pattern, target)) {
            schedule(pattern, target)
            if (this.isAll) return
          }
        }
      })

      parallel(tasks, done)
    })

    return maybe(cb, promise)
  }

  resolve (file) {
    file = path.resolve(file)
    if (file.indexOf(this.dest) !== 0) {
      return null
    }

    var pattern = file.replace(this.dest + path.sep, '')
    if (this.has(pattern)) return pattern
    else return null
  }

  set opts (opts) {
    opts = opts || {}

    this.isAll = opts.isAll || false
    this.isPrune = opts.isPrune || false
    this.noVerify = opts.noVerify || false
  }
}

function createPrune (pattern) {
  return function (cb) {
    if (!this.isPrune) return

    var promise = box(done => {
      prune(this.dest, [pattern], done)
    })

    return maybe(cb, promise)
  }
}

function createWrite (pattern) {
  return function (file, cb) {
    assert.strictEqual(typeof file, 'object', 'file descriptor must be valid object')
    assert.strictEqual(typeof file.path, 'string', 'file path must be a string')
    assert.ok(file.contents, 'file needs contents to be written')

    var promise = box(done => {
      file.path = file.relative
        ? path.join(this.dest, file.relative)
        : path.join(this.dest, file.path)

      if (!mm.isMatch(file.path, pattern)) {
        return done()
      }
      write(file, done)
    })

    return maybe(cb, promise)
  }
}

function execute (pattern, target, cb) {
  var task = this.targets[target]
  var wildcards = mm.capture(target, pattern) || mm.capture(target, target)
  var args = [{ target, wildcards }]
  var context = {
    prune: createPrune(this.isAll ? target : pattern).bind(this),
    write: createWrite(path.join(this.dest, pattern)).bind(this)
  }

  if (task.opts.useCallback) {
    args.push((err, res) => {
      if (err) return cb(err)
      verify.call(this, res, pattern, cb)
    })
    task.fn.apply(context, args)
  } else {
    var result = task.fn.apply(context, args)
    verify.call(this, result, pattern, cb)
  }
}

function match (pattern, target) {
  return mm.isMatch(pattern, target) || mm.isMatch(target, pattern)
}

function verify (result, pattern, cb) {
  if (this.noVerify) return cb()
  if (result === undefined || result === null) result = true
  if (typeof result.then === 'function') {
    return result.then(res => {
      verify.call(this, res, pattern, cb)
    }).catch(cb)
  }

  fg(path.join(this.dest, pattern)).then(files => {
    if (files.length) cb()
    else cb(new Error('No files were generated for pattern ' + pattern))
  }).catch(cb)
}

module.exports = Build
