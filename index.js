var assert = require('assert')
var fs = require('fs')
var glob = require('pull-glob')
var mkdir = require('mkdirp')
var minimatch = require('minimatch')
var minimist = require('minimist')
var path = require('path')
var pull = require('pull-stream')
var rm = require('rimraf')

class Build {
  constructor (dir) {
    this.targets = {}
    this.dir = dir
  }

  static dest (dir) {
    return new Build(dir)
  }

  add (target, fn) {
    assert.ok(typeof target === 'string', 'Invalid target: ' + target)
    assert.ok(typeof fn === 'function', 'Invalid target handler for ' + target)
    this.targets[target] = fn
  }

  clean (files, cb) {
    rm(files.pop(), err => {
      if (err) {
        return cb(err)
      }
      if (files.length) {
        return this.clean(files, cb)
      }
      cb()
    })
  }

  command (cb) {
    var done = function (err) {
      if (err) {
        if (cb) cb(err)
        else throw err
      }
    }
    if (this.opts.clean || this.opts.c) {
      this.clean(this.files, err => {
        if (err) return done(err)
        if (this.opts.all || this.opts.a) {
          this.make(Object.keys(this.targets), done)
        } else if (this.patterns.length) {
          this.make(this.patterns, done)
        }
      })
    } else if (this.opts.all || this.opts.a) {
      this.make(Object.keys(this.targets), done)
    } else if (this.patterns.length) {
      this.make(this.patterns, done)
    }
  }

  fixit (pattern, target, cb, isMatch) {
    if (isMatch !== true) {
      assert.ok(minimatch(pattern, target), target + ' does not match requested target ' + pattern)
    }
    var source = this.targets[target](this.parse(pattern || target))
    if (typeof source.then === 'function') {
      return source.then(() => {
        this.scan(target, cb)
      }).catch(cb)
    }
    pull(
      source,
      pull.drain(file => {
        this.write(file)
      }, err => {
        if (err) return cb(err)
        this.scan(target, cb)
      })
    )
  }

  make (patterns, cb) {
    if (!Array.isArray(patterns)) {
      patterns = [patterns]
    }
    patterns.forEach(pattern => {
      if (this.targets[pattern]) {
        this.fixit(pattern, pattern, cb, true)
      } else {
        for (var target in this.targets) {
          if (target === pattern) continue
          if (minimatch(pattern, target)) {
            this.fixit(pattern, target, cb, true)
            break
          }
        }
      }
    })
  }

  parse (target) {
    var parsed = path.parse(target)
    parsed.dir = path.join(this.dir, parsed.dir)
    return parsed
  }

  scan (target, cb) {
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
  
  write (file, cb) {
    mkdir(path.dirname(file.path), err => {
      if (err) return cb(err)
      fs.writeFile(file.path, file.contents, file.enc || file.encoding, cb)
    })
  }

  get files () {
    return Object.keys(this.targets).map(target => path.join(this.dir, target))
  }
  
  get opts () {
    var cmdOpts = {
      boolean: ['all', 'a', 'clean', 'c']
    }
    return minimist(process.argv.slice(2), cmdOpts)
  }
  
  get patterns () {
    return this.opts._
  }
}

module.exports = Build
