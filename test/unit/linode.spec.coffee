cli = require('../../modules/cli')
utils = require('../../modules/utils')
api = require('../../modules/providers/linode')

MOCK_CLUSTERS = {
  default: {
    instances: {
      linode01: {
        name: 'linode01'
        ip: '1.2.3.4'
        user: 'root'
        ssh_key: 'overcast.key'
        ssh_port: 22
        linode: {
          id: 1234567
          name: 'linode01'
          distribution: 'Ubuntu'
          status: 1
          datacenter_id: 3
          disk: 49152
          ram: 2048
          ip: '1.2.3.4'
        }
      }
      notlinode: {
        name: 'notlinode'
        ip: '2.3.4.5'
        user: 'root'
        ssh_key: 'overcast.key'
        ssh_port: 22
      }
    }
  }
}

describe 'linode', ->
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
      cli.execute('linode boot')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('linode boot missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not an Linode instance', ->
      cli.execute('linode boot notlinode')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise boot the instance', ->
      spyOn(api, 'boot').andCallFake (instance, callback) ->
        callback()
      cli.execute('linode boot linode01')
      expect(utils.success).toHaveBeenCalledWith('Instance "linode01" booted.')

  describe 'create', ->
    it 'should fail if instance is missing', ->
      cli.execute('linode create')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance already exists', ->
      cli.execute('linode create linode01')
      expect(utils.die).toHaveBeenCalledWith('Instance "linode01" already exists.')

    describe 'valid inputs', ->
      beforeEach ->
        spyOn(api, 'create').andCallFake (args, callback) ->
          response = {
            name: 'linode02'
            ip: '2.3.4.5'
            user: 'root'
            ssh_key: 'overcast.key'
            ssh_port: 22
            linode: {
              id: 1234567
              name: 'linode02'
              distribution: 'Ubuntu'
              status: 1
              datacenter_id: 3
              disk: 49152
              ram: 2048
              ip: '2.3.4.5'
            }
          }
          callback(response)
        spyOn(utils, 'saveInstanceToCluster')

      it 'should handle defaults', ->
        cli.execute('linode create linode02')
        expect(utils.grey).toHaveBeenCalledWith('Creating new instance "linode02" on Linode...')
        expect(utils.success).toHaveBeenCalledWith('Instance "linode02" (2.3.4.5) saved.')

  describe 'destroy', ->
    it 'should fail if instance is missing', ->
      cli.execute('linode destroy')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('linode destroy missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not an Linode instance', ->
      cli.execute('linode destroy notlinode --force')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise destroy the instance', ->
      spyOn(api, 'destroy').andCallFake (instance, callback) ->
        callback()
      spyOn(utils, 'deleteInstance')
      cli.execute('linode destroy linode01 --force')
      expect(utils.success).toHaveBeenCalledWith('Instance "linode01" destroyed.')

  describe 'images', ->

  describe 'instances', ->

  describe 'kernels', ->

  describe 'reboot', ->
    it 'should fail if instance is missing', ->
      cli.execute('linode reboot')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('linode reboot missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not an Linode instance', ->
      cli.execute('linode reboot notlinode')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise reboot the instance', ->
      spyOn(api, 'reboot').andCallFake (instance, callback) ->
        callback()
      cli.execute('linode reboot linode01')
      expect(utils.success).toHaveBeenCalledWith('Instance "linode01" rebooted.')

  describe 'regions', ->

  describe 'resize', ->
    it 'should fail if instance is missing', ->
      cli.execute('linode resize')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if size is missing', ->
      cli.execute('linode resize linode01')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('linode resize missing 4096 --skip-boot')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not an Linode instance', ->
      cli.execute('linode resize notlinode 4096 --skip-boot')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise resize the instance', ->
      spyOn(api, 'resize').andCallFake (instance, size, callback) ->
        callback()
      spyOn(api, 'updateInstanceMetadata').andCallFake (instance, callback) ->
        callback()
      cli.execute('linode resize linode01 4096 --skip-boot')
      expect(utils.success).toHaveBeenCalledWith('Instance "linode01" resized.')

  describe 'shutdown', ->
    it 'should fail if instance is missing', ->
      cli.execute('linode shutdown')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('linode shutdown missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not an Linode instance', ->
      cli.execute('linode shutdown notlinode')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise shutdown the instance', ->
      spyOn(api, 'shutdown').andCallFake (instance, callback) ->
        callback()
      cli.execute('linode shutdown linode01')
      expect(utils.success).toHaveBeenCalledWith('Instance "linode01" has been shut down.')

  describe 'sizes', ->

  describe 'sync', ->
    it 'should fail if instance is missing', ->
      cli.execute('linode sync')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('linode sync missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not an Linode instance', ->
      cli.execute('linode sync notlinode')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise sync the instance metadata', ->
      spyOn(api, 'sync').andCallFake (instance, callback) ->
        callback()
      cli.execute('linode sync linode01')
      expect(utils.success).toHaveBeenCalledWith('Metadata for "linode01" updated.')
