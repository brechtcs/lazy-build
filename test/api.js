var Build = require('../')
var test = require('tape')

test('Build.has', function (t) {
  var build = Build.dest('target')
  build.add('*.txt', function () {})

  t.ok(build.has('*.txt'))
  t.ok(build.has('any.txt'))
  t.notOk(build.has('any.md'))
  t.end()
})

test('Build.resolve', function (t) {
  var build = Build.dest('target')
  build.add('*.txt', function () {})

  t.equal(build.resolve('target/*.txt'), '*.txt')
  t.equal(build.resolve('target/any.txt'), 'any.txt')
  t.notOk(build.resolve('target/any.md'))
  t.end()
})
