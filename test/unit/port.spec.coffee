cli = require('../../modules/cli')
utils = require('../../modules/utils')
ssh = require('../../modules/ssh')

describe 'port', ->
  beforeEach ->
    spyOn(utils, 'getClusters').andReturn({
        dummy: {
          instances: {
            'vm-01': {
              name: 'vm-01'
              ip: '1.1.1.1'
              user: 'root'
              ssh_key: 'overcast.key'
              ssh_port: '22'
            }
          }
        }
      })
    spyOn(cli, 'missingArgument')
    spyOn(utils, 'die')
    spyOn(utils, 'grey')
    spyOn(utils, 'cyan')
    spyOn(utils, 'dieWithList')
    spyOn(ssh, 'run').andCallFake (args, callback) ->
      callback()

  it 'should throw an error if name is missing', ->
    cli.execute('port')
    expect(cli.missingArgument).toHaveBeenCalled()

  it 'should throw an error if port is missing', ->
    cli.execute('port vm-01')
    expect(cli.missingArgument).toHaveBeenCalled()

  it 'should throw an error if instance is not found', ->
    cli.execute('port missing-vm 22222')
    expect(utils.dieWithList).toHaveBeenCalled()

  it 'should otherwise update the port', ->
    spyOn(utils, 'updateInstance')
    cli.execute('port vm-01 22222')
    expect(utils.updateInstance).toHaveBeenCalledWith('vm-01', { ssh_port: '22222' })
