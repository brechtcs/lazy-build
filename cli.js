var minimist = require('minimist')

module.exports = async function (build) {
  var args = minimist(process.argv.slice(2), {
    boolean: true,
    default: {
      verify: true
    }
  })

  build.opts = {
    isAll: args.all || args.a,
    isPrune: args.prune || args.p,
    strictMode: args.strict
  }

  var clean = args.clean || args.c
  var patterns = getPatterns(build, args._)

  try {
    if (clean) await build.clean()
    await build.make(patterns)
  } catch (err) {
    process.stderr.write(err.stack + '\n')
    if (build.strictMode) process.exit(1)
  }
}

function getPatterns (build, patterns) {
  if (build.isAll) {
    return Object.keys(build.targets)
  }

  return patterns.map(function (pattern) {
    if (build.has(pattern)) return pattern
    return build.resolve(pattern)
  }).filter(pattern => pattern !== null)
}
