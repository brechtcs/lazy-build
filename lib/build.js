var TargetContext = require('./context')
var assert = require('assert')
var box = require('callbox')
var fg = require('fast-glob')
var fs = require('fs')
var match = require('./match')
var maybe = require('call-me-maybe')
var mkdir = require('mkdirp')
var parallel = require('run-parallel')
var path = require('path')
var prune = require('./prune')

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
      var files = Object.keys(this.targets).map(target => {
        return path.join(this.dest, target)
      })
      prune(this.dest, files, done)
    })

    return maybe(cb, promise)
  }

  has (pattern) {
    for (var target in this.targets) {
      if (target === pattern) return true
      if (match.verify(target, pattern)) return true
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
        tasks.push(end => execute.call(this, pattern, target, end))
      }

      patterns.forEach(pattern => {
        if (this.targets[pattern]) {
          schedule(pattern, pattern)
          if (this.isAll) return
        }
        for (var target in this.targets) {
          if (target === pattern) continue
          if (match.verify(target, pattern)) {
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

function execute (pattern, target, cb) {
  var task = this.targets[target]
  var ctx = new TargetContext(this, target, pattern)

  if (task.opts.useCallback) {
    task.fn(ctx, (err, result) => {
      if (err) return cb(err)
      verify.call(this, result, pattern, cb)
    })
  } else {
    var result = task.fn(ctx)
    verify.call(this, result, pattern, cb)
  }
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
