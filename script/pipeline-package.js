'use strict'

var fs = require('fs')
var path = require('path')
var exec = require('child_process').exec
var vfile = require('to-vfile')
var findDown = require('vfile-find-down')
var trough = require('trough')
var uniq = require('uniq')

module.exports = trough()
  .use(function(ctx, next) {
    vfile.read(path.join(ctx.root, 'package.json'), function(err, file) {
      ctx.package = file
      next(err)
    })
  })
  .use(function(ctx, next) {
    var fp = path.relative(ctx.ancestor, ctx.root)
    var cmd = 'git log --all --format="%cN <%cE>" "' + fp + '"'

    exec(cmd, function(err, stdout) {
      if (err) return next(err)

      ctx.contributors = uniq(stdout.split('\n'))
        .sort()
        .filter(Boolean)

      if (ctx.contributors.length === 0) {
        ctx.contributors = null
      }

      next()
    })
  })
  .use(function(ctx, next) {
    findDown.all(['.js', '.json'], ctx.root, function(err, files) {
      if (files) {
        ctx.files = files
          .map(function(file) {
            return path.relative(ctx.root, file.path)
          })
          .filter(function(name) {
            return name !== 'package.json' && !/(example|test)/.test(name)
          })
          .sort()
      }

      next(err)
    })
  })
  .use(function(ctx) {
    var previous = JSON.parse(ctx.package)
    var pkg = require(path.join(ctx.ancestor, 'package.json'))
    var relative = path.relative(ctx.ancestor, ctx.root)

    var curr = {
      name: path.basename(ctx.root),
      version: previous.version,
      description: previous.description,
      license: pkg.license,
      keywords: previous.keywords,
      repository: pkg.repository + '/tree/master/' + relative,
      bugs: pkg.bugs,
      funding: pkg.funding,
      author: pkg.author,
      contributors: ctx.contributors || [pkg.author],
      browser: previous.browser || undefined,
      files: ctx.files || previous.files,
      dependencies: previous.dependencies,
      excludeFromPreset: previous.excludeFromPreset,
      xo: false
    }

    ctx.package.contents = JSON.stringify(curr, 0, 2) + '\n'
  })
  .use(function(ctx, next) {
    fs.writeFile(ctx.package.path, ctx.package.contents, next)
  })
  .use(function(ctx) {
    ctx.package.stored = true
  })
