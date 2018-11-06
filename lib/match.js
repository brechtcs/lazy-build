var mm = require('micromatch')

module.exports.capture = function capture (target, pattern) {
  return mm.capture(target, pattern) || mm.capture(target, target)
}

module.exports.verify = function verify (target, pattern) {
  return mm.isMatch(pattern, target) || mm.isMatch(target, pattern)
}
