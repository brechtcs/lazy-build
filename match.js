var minimatch = require('minimatch')

module.exports = function (pattern, target) {
  return !pattern || minimatch(pattern, target)
}