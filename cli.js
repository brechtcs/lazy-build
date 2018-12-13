var Build = require('./')
var assert = require('assert')
var errors = require('./lib/errors')
var minimist = require('minimist')

class BuildCLI extends Build {
  constructor (dest, opts) {
    super(dest, opts)

    this.config({
      isAll: this.args.all || this.args.a,
      isPrune: this.args.prune || this.args.p,
      strictMode: this.args.strict
    })
  }

  async make () {
    try {
      var clean = this.args.clean || this.args.c
      var patterns = getPatterns(this, this.args._)

      if (clean) await this.clean()
      await super.make(patterns)
    } catch (err) {
      process.stderr.write(err.stack + '\n')
      if (this.strictMode) process.exit(1)
    }
  }

  get args () {
    return minimist(process.argv.slice(2), {
      boolean: true,
      default: {
        verify: true
      }
    })
  }
}

function getPatterns (build, patterns) {
  if (build.isAll) {
    return Object.keys(build.targets)
  }

  return patterns.map(function (pattern) {
    if (build.has(pattern)) {
      return pattern
    }

    var resolved = build.resolve(pattern)
    if (build.strictMode) {
      assert.ok(build.has(resolved), errors.notFound(pattern))
    }
    return resolved
  })
}

module.exports = BuildCLI
