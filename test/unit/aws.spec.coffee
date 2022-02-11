cli = require('../../src/cli')
utils = require('../../src/utils')
api = require('../../src/providers/aws')

MOCK_CLUSTERS = {
  default: {
    instances: {
      aws01: {
        name: 'aws01'
        ip: '1.2.3.4'
        user: 'root'
        ssh_key: 'overcast.key'
        ssh_port: 22
        aws: {
          id: 'i-da86d91a',
          size: 't1.micro',
          image: 'ami-64e27e0c'
          monitoring: 'disabled'
          region: 'us-east-1'
          public_dns_name: 'ec2-1-2-3-4.compute-1.amazonaws.com'
          private_ip: '172-2-3-4'
          private_dns_name: 'ip-172-2-3-4.ec2.internal'
        }
      }
      notaws: {
        name: 'notaws'
        ip: '2.3.4.5'
        user: 'root'
        ssh_key: 'overcast.key'
        ssh_port: 22
      }
    }
  }
}

describe 'aws', ->
  beforeEach ->
    spyOn(utils, 'getClusters').andReturn(MOCK_CLUSTERS)
    spyOn(utils, 'die')
    spyOn(utils, 'red')
    spyOn(utils, 'grey')
    spyOn(utils, 'success')
    spyOn(utils, 'dieWithList')
    spyOn(utils, 'waitForBoot')
    spyOn(cli, 'missingArgument')

  describe 'boot', ->
    it 'should fail if instance is missing', ->
      cli.execute('aws boot')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('aws boot missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not an EC2 instance', ->
      cli.execute('aws boot notaws')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise boot the instance', ->
      spyOn(api, 'boot').andCallFake (instance, callback) ->
        callback()
      cli.execute('aws boot aws01')
      expect(utils.success).toHaveBeenCalledWith('Instance "aws01" booted.')

  describe 'create', ->
    it 'should fail if instance is missing', ->
      cli.execute('aws create')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance already exists', ->
      cli.execute('aws create aws01')
      expect(utils.die).toHaveBeenCalledWith('Instance "aws01" already exists.')

    describe 'valid inputs', ->
      beforeEach ->
        spyOn(api, 'create').andCallFake (args, callback) ->
          response = {
            name: 'aws02'
            ip: '2.3.4.5'
            user: 'root'
            ssh_key: 'overcast.key'
            ssh_port: 22
            aws: {
              id: 'i-76fa51bc',
              size: 't1.micro',
              image: 'ami-64e27e0c'
              monitoring: 'disabled'
              region: 'us-east-1'
              public_dns_name: 'ec2-1-2-3-4.compute-1.amazonaws.com'
              private_ip: '172-2-3-4'
              private_dns_name: 'ip-172-2-3-4.ec2.internal'
            }
          }
          callback(response)
        spyOn(utils, 'saveInstanceToCluster')

      it 'should handle defaults', ->
        cli.execute('aws create aws02')
        expect(utils.grey).toHaveBeenCalledWith('Creating new instance "aws02" on AWS...')
        expect(utils.success).toHaveBeenCalledWith('Instance "aws02" (2.3.4.5) saved.')

  describe 'destroy', ->
    it 'should fail if instance is missing', ->
      cli.execute('aws destroy')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('aws destroy missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not an EC2 instance', ->
      cli.execute('aws destroy notaws --force')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise destroy the instance', ->
      spyOn(api, 'destroy').andCallFake (instance, callback) ->
        callback()
      spyOn(utils, 'deleteInstance')
      cli.execute('aws destroy aws01 --force')
      expect(utils.success).toHaveBeenCalledWith('Instance "aws01" destroyed.')

  describe 'instances', ->

  describe 'reboot', ->
    it 'should fail if instance is missing', ->
      cli.execute('aws reboot')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('aws reboot missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not an EC2 instance', ->
      cli.execute('aws reboot notaws')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise reboot the instance', ->
      spyOn(api, 'reboot').andCallFake (instance, callback) ->
        callback()
      cli.execute('aws reboot aws01')
      expect(utils.success).toHaveBeenCalledWith('Instance "aws01" rebooted.')

  describe 'regions', ->

  describe 'shutdown', ->
    it 'should fail if instance is missing', ->
      cli.execute('aws shutdown')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('aws shutdown missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not an EC2 instance', ->
      cli.execute('aws shutdown notaws')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise shutdown the instance', ->
      spyOn(api, 'shutdown').andCallFake (instance, callback) ->
        callback()
      cli.execute('aws shutdown aws01')
      expect(utils.success).toHaveBeenCalledWith('Instance "aws01" has been shut down.')
