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
    noVerify: !args.verify
  }

  var clean = args.clean || args.c
  var patterns = build.isAll ? Object.keys(build.targets) : args._

  try {
    if (clean) await build.clean()
    await build.make(patterns)
  } catch (err) {
    console.error(err)
  }
}
