cli = require('../../src/cli')
utils = require('../../src/utils')
api = require('../../src/providers/digitalocean.v2')

MOCK_CLUSTERS = {
  default: {
    instances: {
      dummy01: {
        name: 'dummy01'
        ip: '1.2.3.4'
        user: 'root'
        ssh_key: 'overcast.key'
        ssh_port: 22
        digitalocean: {
          id: 12345678
          name: 'dummy01'
          memory: 512
          disk: 20
          status: 'active'
          size: {
            slug: '512mb'
          }
          networks: {
            v4: [
              ip_address: '1.2.3.4'
            ]
          }
        }
      }
      notdigitalocean: {
        name: 'notdigitalocean'
        ip: '2.3.4.5'
        user: 'root'
        ssh_key: 'overcast.key'
        ssh_port: 22
      }
    }
  }
}

describe 'digitalocean', ->
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
      cli.execute('digitalocean boot')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('digitalocean boot missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not a DigitalOcean VM', ->
      cli.execute('digitalocean boot notdigitalocean')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise boot the instance', ->
      spyOn(api, 'dropletAction').andCallFake (instance, data, callback) ->
        callback()
      cli.execute('digitalocean boot dummy01')
      expect(log.success).toHaveBeenCalledWith('Instance "dummy01" booted.')

  describe 'create', ->
    it 'should fail if instance is missing', ->
      cli.execute('digitalocean create')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance already exists', ->
      cli.execute('digitalocean create dummy01')
      expect(utils.die).toHaveBeenCalledWith('Instance "dummy01" already exists.')

    describe 'valid inputs', ->
      beforeEach ->
        spyOn(api, 'create').andCallFake (args, callback) ->
          response = {
            name: 'dummy02'
            ip: '2.3.4.5'
            user: 'root'
            ssh_key: 'overcast.key'
            ssh_port: 22
            digitalocean: {
              id: 12345678
              name: 'dummy02'
              memory: 512
              disk: 20
              status: 'active'
              networks: {
                v4: [
                  ip_address: '2.3.4.5'
                ]
              }
            }
          }
          callback(response)
        spyOn(utils, 'saveInstanceToCluster')

      it 'should handle defaults', ->
        cli.execute('digitalocean create dummy02')
        expect(utils.grey).toHaveBeenCalledWith('Creating new instance "dummy02" on DigitalOcean...')
        expect(log.success).toHaveBeenCalledWith('Instance "dummy02" (2.3.4.5) saved.')

  describe 'destroy', ->
    it 'should fail if instance is missing', ->
      cli.execute('digitalocean destroy')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('digitalocean destroy missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not a DigitalOcean VM', ->
      cli.execute('digitalocean destroy notdigitalocean --force')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise destroy the instance', ->
      spyOn(api, 'destroy').andCallFake (instance, callback) ->
        callback()
      spyOn(utils, 'deleteInstance')
      cli.execute('digitalocean destroy dummy01 --force')
      expect(log.success).toHaveBeenCalledWith('Instance "dummy01" destroyed.')

  describe 'images', ->

  describe 'instances', ->

  describe 'reboot', ->
    it 'should fail if instance is missing', ->
      cli.execute('digitalocean reboot')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('digitalocean reboot missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not a DigitalOcean VM', ->
      cli.execute('digitalocean reboot notdigitalocean')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise reboot the instance', ->
      spyOn(api, 'dropletAction').andCallFake (instance, data, callback) ->
        callback()
      cli.execute('digitalocean reboot dummy01')
      expect(log.success).toHaveBeenCalledWith('Instance "dummy01" rebooted.')

  describe 'rebuild', ->
    beforeEach ->
      spyOn(api, 'updateInstanceMetadata').andCallFake (instance, callback) ->
        callback()

    it 'should fail if instance is missing', ->
      cli.execute('digitalocean rebuild')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if image is missing', ->
      cli.execute('digitalocean rebuild dummy01')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('digitalocean rebuild missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not a DigitalOcean VM', ->
      cli.execute('digitalocean rebuild notdigitalocean debian-7-0-x64')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise rebuild the instance', ->
      spyOn(api, 'ensureDropletIsShutDown').andCallFake (instance, callback) ->
        callback()
      spyOn(api, 'dropletAction').andCallFake (instance, data, callback) ->
        callback()
      cli.execute('digitalocean rebuild dummy01 ubuntu-12-04-x64')
      expect(log.success).toHaveBeenCalledWith('Instance "dummy01" rebuilt.')

  describe 'regions', ->

  describe 'resize', ->
    beforeEach ->
      spyOn(api, 'updateInstanceMetadata').andCallFake (instance, callback) ->
        callback()

    it 'should fail if instance is missing', ->
      cli.execute('digitalocean resize')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if size is missing', ->
      cli.execute('digitalocean resize dummy01')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('digitalocean resize missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not a DigitalOcean VM', ->
      cli.execute('digitalocean resize notdigitalocean 2gb')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise resize the instance', ->
      spyOn(api, 'ensureDropletIsShutDown').andCallFake (instance, callback) ->
        callback()
      spyOn(api, 'dropletAction').andCallFake (instance, data, callback) ->
        callback()
      cli.execute('digitalocean resize dummy01 4gb --skip-boot')
      expect(log.success).toHaveBeenCalledWith('Instance "dummy01" resized.')

  describe 'sizes', ->

  describe 'shutdown', ->
    it 'should fail if instance is missing', ->
      cli.execute('digitalocean shutdown')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('digitalocean shutdown missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not a DigitalOcean VM', ->
      cli.execute('digitalocean shutdown notdigitalocean')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise shutdown the instance', ->
      spyOn(api, 'dropletAction').andCallFake (instance, data, callback) ->
        callback()
      cli.execute('digitalocean shutdown dummy01')
      expect(log.success).toHaveBeenCalledWith('Instance "dummy01" has been shut down.')

  describe 'snapshot', ->
    it 'should fail if instance is missing', ->
      cli.execute('digitalocean snapshot')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if snapshot name is missing', ->
      cli.execute('digitalocean snapshot dummy01')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('digitalocean snapshot missing')
      expect(utils.dieWithList).toHaveBeenCalled()

    it 'should fail if instance is not a DigitalOcean VM', ->
      cli.execute('digitalocean snapshot notdigitalocean snap01')
      expect(utils.die).toHaveBeenCalled()

    it 'should otherwise take a snapshot of the instance', ->
      spyOn(api, 'ensureDropletIsShutDown').andCallFake (instance, callback) ->
        callback()
      spyOn(api, 'dropletAction').andCallFake (instance, data, callback) ->
        callback()
      cli.execute('digitalocean snapshot dummy01 snap01')
      expect(log.success).toHaveBeenCalledWith('Snapshot "snap01" of "dummy01" saved.')

  describe 'snapshots', ->

  describe 'sync', ->
