var minimist = require('minimist')

module.exports = function (build) {
  var done = function (err) { if (err) throw err }
  var args = minimist(process.argv.slice(2), {
    boolean: true,
    default: {
      scan: true
    }
  })

  build.opts = {
    isAll: args.all || args.a,
    isClean: args.clean || args.c,
    isPrune: args.prune || args.p,
    noScan: !args.scan
  }

  build.patterns = build.isAll
    ? Object.keys(build.targets)
    : args._

  if (build.isClean || build.isPrune) {
    build.clean(build.files, err => {
      if (err) done(err)
      else build.make(build.patterns, done)
    })
  } else {
    build.make(build.patterns, done)
  }
}
