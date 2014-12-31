cli = require('../../modules/cli')
utils = require('../../modules/utils')
api = require('../../modules/providers/digitalocean')

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
          image_id: 3701722
          size_id: 66
          region_id: 4
          ip_address: '1.2.3.4'
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

MOCK_IMAGES = [
  { id: 6372105, name: '6.5 x32', slug: 'centos-6-5-x32' }
  { id: 6372108, name: '6.5 x64', slug: 'centos-6-5-x64' }
  { id: 6372526, name: '7.0 x64', slug: 'debian-7-0-x64' }
  { id: 6372528, name: '7.0 x32', slug: 'debian-7-0-x32' }
  { id: 6374128, name: '12.04.5 x64', slug: 'ubuntu-12-04-x64' }
  { id: 6374130, name: '12.04.5 x32', slug: 'ubuntu-12-04-x32' }
  { id: 6918735, name: '14.04 x32', slug: 'ubuntu-14-04-x32' }
  { id: 6918990, name: '14.04 x64', slug: 'ubuntu-14-04-x64' }
  { id: 7053293, name: '7.0 x64', slug: 'centos-7-0-x64' }
]

MOCK_SIZES = [
  { id: 66, name: '512MB', slug: '512mb' }
  { id: 63, name: '1GB', slug: '1gb' }
  { id: 62, name: '2GB', slug: '2gb' }
  { id: 64, name: '4GB', slug: '4gb' }
  { id: 65, name: '8GB', slug: '8gb' }
  { id: 61, name: '16GB', slug: '16gb' }
]

MOCK_REGIONS = [
  { id: 3, name: 'San Francisco 1', slug: 'sfo1' }
  { id: 4, name: 'New York 2', slug: 'nyc2' }
  { id: 6, name: 'Singapore 1', slug: 'sgp1' }
  { id: 7, name: 'London 1', slug: 'lon1' }
  { id: 8, name: 'New York 3', slug: 'nyc3' }
  { id: 9, name: 'Amsterdam 3', slug: 'ams3' }
]

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
      spyOn(api, 'eventedRequest').andCallFake (options) ->
        options.callback()
      cli.execute('digitalocean boot dummy01')
      expect(utils.success).toHaveBeenCalledWith('Instance "dummy01" booted.')

  describe 'create', ->
    it 'should fail if instance is missing', ->
      cli.execute('digitalocean create')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance already exists', ->
      cli.execute('digitalocean create dummy01')
      expect(utils.die).toHaveBeenCalledWith('Instance "dummy01" already exists.')

    describe 'valid inputs', ->
      beforeEach ->
        spyOn(api, 'createRequest').andCallFake (args, query, callback) ->
          response = {
            name: query.name,
            ip: '3.4.5.6',
            ssh_key: args['ssh-key'],
            ssh_port: args['ssh-port'],
            user: 'root',
            digitalocean: {
              id: 12345678
              name: query.name
              image_id: query.image_id
              size_id: query.size_id
              region_id: query.region_id
              ip_address: '3.4.5.6'
              backups_enabled: query.backups_enabled
              private_networking: query.private_networking
            }
          }
          callback(response)
        spyOn(api, 'getOrCreateOvercastKeyID').andCallFake (key, callback) ->
          ssh_key_id = 34957934
          callback(ssh_key_id)
        spyOn(api, 'getImages').andCallFake (fn) -> fn(MOCK_IMAGES)
        spyOn(api, 'getSizes').andCallFake (fn) -> fn(MOCK_SIZES)
        spyOn(api, 'getRegions').andCallFake (fn) -> fn(MOCK_REGIONS)
        spyOn(utils, 'saveInstanceToCluster')

      it 'should handle defaults', ->
        cli.execute('digitalocean create dummy02')
        expect(utils.grey).toHaveBeenCalledWith('Creating new instance "dummy02" on DigitalOcean...')
        query = api.createRequest.mostRecentCall.args[1]
        expect(query.name).toBe 'dummy02'
        expect(query.ssh_key_ids).toBe 34957934
        expect(query.image_id).toBe 6918990 # ubuntu-14-04-x64
        expect(query.size_id).toBe 66 # 512mb
        expect(query.region_id).toBe 8 # nyc3
        expect(query.backups_enabled).toBe false
        expect(utils.success).toHaveBeenCalledWith('Instance "dummy02" (3.4.5.6) saved.')

      it 'should fail if --region is not found', ->
        cli.execute('digitalocean create dummy02 --region "Pawtucket 1"')
        expect(utils.die).toHaveBeenCalledWith('No region found that matches "Pawtucket 1".')

      it 'should handle --region ID', ->
        cli.execute('digitalocean create dummy02 --region 6')
        expect(api.createRequest.mostRecentCall.args[1].region_id).toBe 6

      it 'should handle --region SLUG', ->
        cli.execute('digitalocean create dummy02 --region sfo1')
        expect(api.createRequest.mostRecentCall.args[1].region_id).toBe 3

      it 'should handle --region NAME', ->
        cli.execute('digitalocean create dummy02 --region "Amsterdam 3"')
        expect(api.createRequest.mostRecentCall.args[1].region_id).toBe 9

      it 'should handle --region-slug SLUG', ->
        cli.execute('digitalocean create dummy02 --region-slug sfo1')
        expect(api.createRequest.mostRecentCall.args[1].region_id).toBe 3

      it 'should handle --region-id ID', ->
        cli.execute('digitalocean create dummy02 --region-id 8')
        expect(api.createRequest.mostRecentCall.args[1].region_id).toBe 8

      it 'should fail if --size is not found', ->
        cli.execute('digitalocean create dummy02 --size 9999gb')
        expect(utils.die).toHaveBeenCalledWith('No size found that matches "9999gb".')

      it 'should handle --size SLUG', ->
        cli.execute('digitalocean create dummy02 --size 2gb')
        expect(api.createRequest.mostRecentCall.args[1].size_id).toBe 62

      it 'should fail if --image is not found', ->
        cli.execute('digitalocean create dummy02 --image "19.0 x64"')
        expect(utils.die).toHaveBeenCalledWith('No image found that matches "19.0 x64".')

      it 'should handle --image SLUG', ->
        cli.execute('digitalocean create dummy02 --image debian-7-0-x64')
        expect(api.createRequest.mostRecentCall.args[1].image_id).toBe 6372526

      it 'should handle --backups-enabled', ->
        cli.execute('digitalocean create dummy02 --backups-enabled')
        expect(api.createRequest.mostRecentCall.args[1].backups_enabled).toBe true

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
      spyOn(api, 'request').andCallFake (options) ->
        options.callback()
      spyOn(utils, 'deleteInstance')
      cli.execute('digitalocean destroy dummy01 --force')
      expect(utils.success).toHaveBeenCalledWith('Instance "dummy01" destroyed.')

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
      spyOn(api, 'eventedRequest').andCallFake (options) ->
        options.callback()
      cli.execute('digitalocean reboot dummy01')
      expect(utils.success).toHaveBeenCalledWith('Instance "dummy01" rebooted.')

  describe 'rebuild', ->
    beforeEach ->
      spyOn(api, 'getImages').andCallFake (fn) -> fn(MOCK_IMAGES)
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

    it 'should fail if image is not found', ->
      cli.execute('digitalocean rebuild dummy01 ubuntu-99-04-x64')
      expect(utils.die).toHaveBeenCalledWith('No image found that matches "ubuntu-99-04-x64".')

    it 'should otherwise rebuild the instance', ->
      image_id = null
      spyOn(api, 'eventedRequest').andCallFake (options) ->
        options.callback()
        image_id = options.query.image_id
      cli.execute('digitalocean rebuild dummy01 ubuntu-12-04-x64')
      expect(image_id).toBe 6374128 # ubuntu-12-04-x64
      expect(utils.success).toHaveBeenCalledWith('Instance "dummy01" rebuilt.')

  describe 'regions', ->

  describe 'resize', ->
    beforeEach ->
      spyOn(api, 'getSizes').andCallFake (fn) -> fn(MOCK_SIZES)
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

    it 'should fail if image is not found', ->
      cli.execute('digitalocean resize dummy01 999gb')
      expect(utils.die).toHaveBeenCalledWith('No size found that matches "999gb".')

    it 'should otherwise resize the instance', ->
      size_id = null
      spyOn(api, 'shutdown').andCallFake (instance, callback) ->
        callback()
      spyOn(api, 'eventedRequest').andCallFake (options) ->
        size_id = options.query.size_id
        options.callback()
      cli.execute('digitalocean resize dummy01 4gb --skip-boot')
      expect(size_id).toBe 64 # 4gb
      expect(utils.success).toHaveBeenCalledWith('Instance "dummy01" resized.')

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
      spyOn(api, 'eventedRequest').andCallFake (options) ->
        options.callback()
      cli.execute('digitalocean shutdown dummy01')
      expect(utils.success).toHaveBeenCalledWith('Instance "dummy01" has been shut down.')

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
      spyOn(api, 'shutdown').andCallFake (instance, callback) ->
        callback()
      spyOn(api, 'eventedRequest').andCallFake (options) ->
        options.callback()
      cli.execute('digitalocean snapshot dummy01 snap01')
      expect(utils.success).toHaveBeenCalledWith('Snapshot "snap01" of "dummy01" saved.')

  describe 'snapshots', ->

  describe 'sync', ->
