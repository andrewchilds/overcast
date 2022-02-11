_ = require('lodash')
minimist = require('minimist')
utils = require('../../src/utils')

# Quick and dirty implementation of argument parsing that handles quoted strings
parseArgs = (argStr = '') ->
  args = []
  quoted = false
  utils.each(argStr.split(' '), (arg) ->
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

mockArgs = (argStr = '') ->
  args = minimist(parseArgs(argStr))
  utils.argShift(args, 'command')
  args

mock = {}

mock.emitter = ->
  {
    stdout: {
      on: ->
    }
    stderr: {
      on: ->
    }
    on: ->
  }
