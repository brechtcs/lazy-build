var ScopedFS = require('scoped-fs')
var TargetContext = require('./context')
var assert = require('assert')
var box = require('callbox')
var errors = require('./errors')
var glob = require('dat-glob')
var match = require('./match')
var maybe = require('call-me-maybe')
var mkdir = require('mkdirp')
var parallel = require('run-parallel')
var path = require('path')
var rm = require('dat-rm')

class Build {
  constructor (dest, opts) {
    mkdir.sync(dest)

    this.targets = {}
    this.scope = new ScopedFS(path.resolve(dest))
    this.gitignore = this.scope.createWriteStream('.gitignore', 'utf8')
    this.opts = opts
  }

  add (target, fn, opts) {
    opts = opts || {}
    assert.ok(typeof target === 'string', errors.invalidTarget(target))
    assert.ok(typeof fn === 'function', errors.invalidHandler(target))
    assert.ok(typeof opts === 'object' && !Array.isArray(opts), errors.invalidOptions('build.add'))

    this.targets[target] = { fn, opts }
    this.gitignore.write(target + '\n')
  }

  clean (cb) {
    return rm(this.scope, Object.keys(this.targets), {
      prune: true
    }, cb)
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
    assert.ok(this.scope.constructor.name === 'ScopedFS')
    var fullpath = path.resolve(file)
    assert.ok(fullpath.indexOf(this.scope.base) === 0, errors.outsideDest(file))
    return fullpath.replace(this.scope.base + path.sep, '')
  }

  set opts (opts) {
    opts = opts || {}

    for (var opt in opts) {
      if (opts[opt] === undefined) {
        this[opt] = this[opt] || false
      } else {
        this[opt] = opts[opt]
      }
    }
  }
}

function execute (pattern, target, cb) {
  var task = this.targets[target]
  var ctx = new TargetContext(this, target, pattern, task.opts)

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
  if (result === undefined || result === null) result = true
  if (typeof result.then === 'function') {
    return result.then(res => {
      verify.call(this, res, pattern, cb)
    }).catch(cb)
  }
  if (!this.strictMode) {
    return cb()
  }

  glob(this.scope, pattern).next().then(first => {
    assert(!first.done, errors.noFiles(pattern))
    cb()
  }).catch(cb)
}

module.exports = Build
