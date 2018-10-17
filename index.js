var Path = require('lazy-path')
var assert = require('assert')
var fs = require('fs')
var glob = require('pull-glob')
var mkdir = require('mkdirp')
var mm = require('micromatch')
var path = require('path')
var pull = require('pull-stream')
var read = require('./lib/read')
var rm = require('rimraf')
var rmEmpty = require('delete-empty')
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

  clean (files, cb) {
    rm(files.pop(), err => {
      if (err) {
        return cb(err)
      }
      if (files.length) {
        return this.clean(files, cb)
      }
      rmEmpty(this.dir, err => {
        if (err) cb(err)
        else cb()
      })
    })
  }

  make (patterns, cb) {
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

  read (pattern, enc) {
    return pull(
      glob(pattern),
      pull.asyncMap((path, cb) => read(path, enc, cb)),
      pull.filter(match => !match.dir)
    )
  }

  scan (target, cb) {
    if (this.noScan) {
      return cb()
    }
    var match = false
    pull(
      glob(path.join(this.dir, target)),
      pull.take(1),
      pull.drain(() => {
        match = true
      }, () => {
        if (!match) cb(new Error('No files were created for target ' + target))
        else cb()
      })
    )
  }

  target (fn) {
    return pull.map(file => {
      file.path = fn(Path.from(file.path))
      return file
    })
  }

  write (file) {
    if (file) {
      assert.equal(typeof file, 'object', 'file descriptor must be valid object')
      assert.equal(typeof file.path, 'string', 'file path must be a string')
      assert.ok(file.contents, 'file needs contents to be written')

      return new Promise((resolve, reject) => {
        file.path = path.join(this.dir, file.path)
        write(file, err => {
          if (err) {
            return reject(err)
          }
          resolve()
        })
      })
    }
    return pull.asyncMap((file, cb) => {
      file.path = path.join(this.dir, file.path)
      write(file, cb)
    })
  }

  get files () {
    var targets = this.isClean ? Object.keys(this.targets) : this.patterns
    return targets.map(target => path.join(this.dir, target))
  }

  set opts (opts) {
    opts = opts || {}

    this.isAll = opts.isAll || false
    this.isClean = opts.isClean || false
    this.isPrune = opts.isPrune || false
    this.noScan = opts.noScan || false
  }
}

function make (pattern, target, cb) {
  var params = mm.capture(target, pattern) || mm.capture(target, target)
  var source = this.targets[target](params)

  if (typeof source.then === 'function') {
    source.then(() => {
      this.scan(target, cb)
    }).catch(cb)
  } else if (typeof source === 'function') {
    pull(
      source,
      pull.drain(null, err => {
        if (err) return cb(err)
        this.scan(target, cb)
      })
    )
  }
}

module.exports = Build
