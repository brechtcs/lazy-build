var minimist = require('minimist')

module.exports = async function (build) {
  var done = function (err) { if (err) throw err }
  var args = minimist(process.argv.slice(2), {
    boolean: true,
    default: {
      scan: true
    }
  })

  build.opts = {
    isAll: args.all || args.a,
    isPrune: args.prune || args.p,
    noScan: !args.scan
  }

  var clean = args.clean || args.c
  var patterns = build.isAll ? Object.keys(build.targets) : args._

  if (clean) await build.clean()
  build.make(patterns, done)
}
