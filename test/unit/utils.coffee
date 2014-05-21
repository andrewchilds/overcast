_ = require('lodash')
minimist = require('minimist')
utils = require('../../modules/utils')
Promise = require('bluebird')

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

exports.spies = {
  ec2: {}
  virtualbox: {}
}

exports.mock = {}
exports.mockData = {}

exports.endpoints = {
  ec2: [
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
  virtualbox: [
    'getImages'
    'createBox'
    'createInstance'
    'stopInstance'
    'startInstance'
    'destroyInstance'
  ]
}

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

exports.mock.virtualbox = ->
  obj = {}

  mockFn = (endpoint) ->
    exports.spies.virtualbox[endpoint] = jasmine.createSpy('virtualbox.' + endpoint).andCallFake (params) ->
      new Promise (resolve, reject) ->
        resolve(_.extend(params, exports.mockData.virtualbox[endpoint] || {}))
    obj[endpoint] = exports.spies.virtualbox[endpoint]

  _.map(exports.endpoints.virtualbox, mockFn)

  obj

exports.mockData.virtualbox = {
  getImages: { vagrantImages: ['trusty64'] }
  createBox: {}
  createInstance: { ip: '1.2.3.4', dir: '/path/to/1.2.3.4' }
  stopInstance: {}
  startInstance: {}
  destroyInstance: {}
}

exports.mock.ec2 = ->
  obj = {}

  mockFn = (endpoint) ->
    exports.spies.ec2[endpoint] = jasmine.createSpy('ec2.' + endpoint).andCallFake (params, cb) ->
      cb(null, exports.mockData.ec2[endpoint])
    obj[endpoint] = exports.spies.ec2[endpoint]

  _.map(exports.endpoints.ec2, mockFn)

  obj

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
