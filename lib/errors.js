module.exports = {
  invalidFile: method => method + ': file descriptor must be valid object',
  invalidFilepath: method => method + ': file path must be a string',
  invalidHandler: target => 'Invalid target handler for ' + target,
  invalidOptions: method => method + ': Invalid options object',
  invalidTarget: target => 'Target must be of type string, found: ' + typeof target,
  noContents: file => file.path + ' is missing contents to be written',
  noFiles: pattern => 'No files were generated for pattern ' + pattern,
  noMatch: (method, path, target) => method + ': filepath ' + path + ' does not match build target ' + target,
  useCallback: target => target + ': callback only allowed if `useCallback` is true'
}
