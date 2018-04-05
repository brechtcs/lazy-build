var assert = require('assert')
var fs = require('fs')
var glob = require('pull-glob')
var mkdir = require('mkdirp')
var minimist = require('minimist')
var mm = require('micromatch')
var path = require('path')
var pull = require('pull-stream')
var pump = require('pump')
var rm = require('rimraf')

class Build {
  constructor (dir) {
    mkdir.sync(dir)

    this.targets = {}
    this.dir = dir
    this.gitignore = fs.createWriteStream(path.join(dir, '.gitignore'), 'utf8')
  }

  static dest (dir) {
    return new Build(dir)
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
    if (this.args.clean || this.args.c) {
      this.clean(this.files, err => {
        if (err) return done(err)
        if (this.args.all || this.args.a) {
          this.make(Object.keys(this.targets), done)
        } else if (this.patterns.length) {
          this.make(this.patterns, done)
        }
      })
    } else if (this.args.all || this.args.a) {
      this.make(Object.keys(this.targets), done)
    } else if (this.patterns.length) {
      this.make(this.patterns, done)
    }
  }

  fixit (pattern, target, cb, isMatch) {
    if (isMatch !== true) {
      assert.ok(mm.isMatch(target, pattern), target + ' does not match requested target ' + pattern)
    }
    var params = mm.capture(pattern, target)
    var source = this.targets[target](params)

    if (typeof source.then === 'function') {
      return source.then(() => {
        this.scan(target, cb)
      }).catch(cb)
    }
    pull(
      source,
      pull.drain(file => {
        this.write(file, cb)
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
          if (mm.isMatch(target, pattern)) {
            this.fixit(pattern, target, cb, true)
            break
          }
        }
      }
    })
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
    var dest = path.join(this.dir, file.path)
    mkdir(path.dirname(dest), err => {
      if (err) return cb(err)
      if (typeof file.contents.pipe === 'function') {
        pump([file.contents, fs.createWriteStream(dest, file.encoding)], cb)
      } else {
        fs.writeFile(dest, file.contents, file.enc || file.encoding, cb)
      }
    })
  }

  get args () {
    var cmdOpts = {
      boolean: ['all', 'a', 'clean', 'c']
    }
    return minimist(process.argv.slice(2), cmdOpts)
  }

  get files () {
    return Object.keys(this.targets).map(target => path.join(this.dir, target))
  }

  get patterns () {
    return this.args._
  }
}

module.exports = Build
