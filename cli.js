var Build = require('./')
var assert = require('assert')
var errors = require('./lib/errors')
var minimist = require('minimist')

class BuildCLI extends Build {
  constructor (dest, opts) {
    super(dest, opts)

    this.config({
      isPrune: this.args.prune || this.args.p,
      strictMode: this.args.strict
    })
  }

  async make () {
    try {
      var patterns = getPatterns(this)

      if (this.args.clean || this.args.c) {
        await this.clean(patterns)
      } else {
        await super.make(patterns)
      }
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

function getPatterns (build) {
  var patterns = build.args._

  if (!patterns.length) {
    return undefined
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
