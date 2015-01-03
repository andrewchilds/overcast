cli = require('../../modules/cli')
utils = require('../../modules/utils')
api = require('../../modules/providers/virtualbox')

MOCK_CLUSTERS = {
  default: {
    instances: {
      vm01: {
        name: 'vm01'
        ip: '192.168.22.10'
        user: 'root'
        ssh_key: 'overcast.key'
        ssh_port: '22'
        virtualbox: {
          dir: '/Users/Me/.overcast-vagrant/192.168.22.10'
          name: 'trusty64.192.168.22.10'
          image: 'trusty64'
          ram: '512'
          cpus: '1'
        }
      }
      notvirtualbox: {
        name: 'notvirtualbox'
        ip: '2.3.4.5'
        user: 'root'
        ssh_key: 'overcast.key'
        ssh_port: 22
      }
    }
  }
}

describe 'virtualbox', ->
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
      cli.execute('virtualbox boot')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('virtualbox boot missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not an EC2 instance', ->
      cli.execute('virtualbox boot notvirtualbox')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise boot the instance', ->
      spyOn(api, 'boot').andCallFake (instance, callback) ->
        callback()
      cli.execute('virtualbox boot vm01')
      expect(utils.success).toHaveBeenCalledWith('Instance "vm01" booted.')

  describe 'create', ->
    it 'should fail if instance is missing', ->
      cli.execute('virtualbox create')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance already exists', ->
      cli.execute('virtualbox create vm01')
      expect(utils.die).toHaveBeenCalledWith('Instance "vm01" already exists.')

    describe 'valid inputs', ->
      beforeEach ->
        spyOn(api, 'create').andCallFake (args, callback) ->
          response = {
            name: 'vm02'
            ip: '192.168.22.11'
            user: 'root'
            ssh_key: 'overcast.key'
            ssh_port: '22'
            virtualbox: {
              dir: '/Users/Me/.overcast-vagrant/192.168.22.11'
              name: 'trusty64.192.168.22.11'
              image: 'trusty64'
              ram: '512'
              cpus: '1'
            }
          }
          callback(response)
        spyOn(utils, 'saveInstanceToCluster')

      it 'should handle defaults', ->
        cli.execute('virtualbox create vm02')
        expect(utils.grey).toHaveBeenCalledWith('Creating new instance "vm02" on VirtualBox...')
        expect(utils.success).toHaveBeenCalledWith('Instance "vm02" (192.168.22.11) saved.')

  describe 'destroy', ->
    it 'should fail if instance is missing', ->
      cli.execute('virtualbox destroy')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('virtualbox destroy missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not an EC2 instance', ->
      cli.execute('virtualbox destroy notvirtualbox --force')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise destroy the instance', ->
      spyOn(api, 'destroy').andCallFake (instance, callback) ->
        callback()
      spyOn(utils, 'deleteInstance')
      cli.execute('virtualbox destroy vm01 --force')
      expect(utils.success).toHaveBeenCalledWith('Instance "vm01" destroyed.')

  describe 'reboot', ->
    it 'should fail if instance is missing', ->
      cli.execute('virtualbox reboot')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('virtualbox reboot missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not an EC2 instance', ->
      cli.execute('virtualbox reboot notvirtualbox')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise reboot the instance', ->
      spyOn(api, 'reboot').andCallFake (instance, callback) ->
        callback()
      cli.execute('virtualbox reboot vm01')
      expect(utils.success).toHaveBeenCalledWith('Instance "vm01" rebooted.')

  describe 'shutdown', ->
    it 'should fail if instance is missing', ->
      cli.execute('virtualbox shutdown')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('virtualbox shutdown missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not an EC2 instance', ->
      cli.execute('virtualbox shutdown notvirtualbox')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise shutdown the instance', ->
      spyOn(api, 'shutdown').andCallFake (instance, callback) ->
        callback()
      cli.execute('virtualbox shutdown vm01')
      expect(utils.success).toHaveBeenCalledWith('Instance "vm01" has been shut down.')
