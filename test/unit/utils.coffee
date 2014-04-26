minimist = require('minimist')
utils = require('../../modules/utils')
Promise = require('bluebird')

exports.mockArgs = (argStr = '') ->
  args = minimist(argStr.split(' '))
  utils.argShift(args, 'command')
  args

exports.mockPromise = (returnValue) ->
  Promise.resolve(returnValue)
