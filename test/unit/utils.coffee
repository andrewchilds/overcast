_ = require('lodash')
minimist = require('minimist')
utils = require('../../modules/utils')

# Quick and dirty implementation of argument parsing that handles quoted strings
exports.parseArgs = (argStr = '') ->
  args = []
  quoted = false
  _.each(argStr.split(' '), (arg) ->
    if (quoted)
      if (arg.charAt(arg.length - 1) is '"')
        arg = arg.substr(0, arg.length - 1)
        quoted = false
      args[args.length - 1] += ' ' + arg
    else if (arg.charAt(0) is '"')
      if (arg.charAt(arg.length - 1) is '"')
        arg = arg.substr(0, arg.length - 1)
      else
        quoted = true
      args.push(arg.substr(1))
    else
      args.push(arg)
  )
  args

exports.mockArgs = (argStr = '') ->
  args = minimist(exports.parseArgs(argStr))
  utils.argShift(args, 'command')
  args

exports.mock = {}

exports.mock.emitter = ->
  {
    stdout: {
      on: ->
    }
    stderr: {
      on: ->
    }
    on: ->
  }
