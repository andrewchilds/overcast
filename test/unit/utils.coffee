_ = require('lodash')
minimist = require('minimist')
utils = require('../../modules/utils')
Promise = require('bluebird')

exports.spies = {}
exports.spies.ec2 = {}

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

exports.mock.ec2 = ->
  obj = {}

  endpoints = [
    'describeImages'
    'describeInstances'
    'describeKeyPairs'
    'describeRegions'
    'importKeyPair'
    'rebootInstances'
    'runInstances'
    'startInstances'
    'stopInstances'
    'terminateInstances'
  ]

  mockFn = (endpoint) ->
    exports.spies.ec2[endpoint] = jasmine.createSpy('ec2.' + endpoint).andCallFake (params, cb) ->
      cb(null, exports.mockData.ec2[endpoint])
    obj[endpoint] = exports.spies.ec2[endpoint]

  _.map(endpoints, mockFn)

  obj

exports.mockData = {}

exports.mockData.ec2 = {
  describeImages: {}
  describeInstances: {
    "Reservations": [
      {
        "Instances": [
          {
            "InstanceId": "InstanceId",
            "State": {
              "Code": 16,
              "Name": "running"
            },
            "PublicDnsName": "PublicDnsName"
            "PublicIpAddress": "1.1.1.1"
            "PrivateDnsName": "PrivateDnsName"
            "PrivateIpAddress": "PrivateIpAddress"
          }
        ]
      }
    ]
  }
  describeKeyPairs: {
    "KeyPairs": []
  }
  describeRegions: {}
  importKeyPair: {
    "KeyName": "KeyName",
    "KeyFingerprint": "KeyFingerprint"
  }
  rebootInstances: {
    "return": "true"
  }
  runInstances: {
    "Instances": [
      {
        "InstanceId": "InstanceId",
        "State": {
          "Code": 0,
          "Name": "pending"
        }
      }
    ]
  }
  startInstances: {
    "StartingInstances": [
      {
        "InstanceId": "InstanceId",
        "CurrentState": {
          "Code": 0,
          "Name": "pending"
        },
        "PreviousState": {
          "Code": 80,
          "Name": "stopped"
        }
      }
    ]
  }
  stopInstances: {
    "StoppingInstances": [
      {
        "InstanceId": "InstanceId",
        "CurrentState": {
          "Code": 64,
          "Name": "stopping"
        },
        "PreviousState": {
          "Code": 16,
          "Name": "running"
        }
      }
    ]
  }
  terminateInstances: {
    "TerminatingInstances": [
      {
        "InstanceId": "InstanceId",
        "CurrentState": {
          "Code": 32,
          "Name": "shutting-down"
        },
        "PreviousState": {
          "Code": 16,
          "Name": "running"
        }
      }
    ]
  }
}
