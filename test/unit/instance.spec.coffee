cli = require('../../modules/cli')
utils = require('../../modules/utils')

describe 'instance', ->
  beforeEach ->
    spyOn(utils, 'getClusters').andReturn({
        dummy: {
          instances: {
            dummy01: {
              user: 'root'
              name: 'dummy01'
              ip: '127.0.0.1'
              ssh_port: '22'
            }
          }
        }
        db: {
          instances: {
            db_01: {
              user: 'root'
              name: 'db_01'
              ip: '1.1.1.1'
              ssh_port: '22'
            }
            db_02: {
              user: 'root'
              name: 'db_02'
              ip: '2.2.2.2'
              ssh_port: '22'
            }
          }
        }
        empty: {
          instances: {}
        }
      })
    spyOn(utils, 'saveClusters').andCallFake (clusters, callback) -> callback()
    spyOn(cli, 'missingArgument')
    spyOn(cli, 'missingCommand')
    spyOn(utils, 'die')

  describe 'get', ->
    beforeEach ->
      spyOn(console, 'log')

    it 'should fail if name is missing', ->
      cli.execute('instance get')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if attribute is missing', ->
      cli.execute('instance get dummy')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should return the requested instance attribute', ->
      cli.execute('instance get dummy name ip')
      expect(console.log.argsForCall[0]).toEqual ['dummy01']
      expect(console.log.argsForCall[1]).toEqual ['127.0.0.1']

    it 'should handle --single-line option', ->
      cli.execute('instance get db origin --single-line')
      expect(console.log.argsForCall[0]).toEqual ['root@1.1.1.1:22 root@2.2.2.2:22']

    it 'should return the requested cluster attribute', ->
      cli.execute('instance get all ip')
      expect(console.log.argsForCall).toEqual [
        ['127.0.0.1']
        ['1.1.1.1']
        ['2.2.2.2']
      ]

  describe 'import', ->
    it 'should fail if name is missing', ->
      cli.execute('instance import')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if ip is missing', ->
      cli.execute('instance import dummy02')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if name already exists in cluster', ->
      cli.execute('instance import dummy01 127.0.0.2 --cluster dummy')
      expect(utils.die.mostRecentCall.args[0]).toContain('Instance "dummy01" already exists')

    it 'otherwise it should import the instance', ->
      cli.execute('instance import dummy02 127.0.0.2 --cluster dummy')
      savedInstance = utils.saveClusters.mostRecentCall.args[0].dummy.instances.dummy02
      expect(savedInstance.name).toBe 'dummy02'
      expect(savedInstance.ip).toBe '127.0.0.2'
      expect(savedInstance.ssh_port).toBe '22'
      expect(savedInstance.user).toBe 'root'

  describe 'list', ->
    it 'should list the instances', ->
      spyOn(console, 'log')
      cli.execute('instance list')
      expect(console.log.argsForCall).toEqual [
        ['dummy01']
        ['db_01']
        ['db_02']
      ]

    it 'should list the instances of the cluster specified', ->
      spyOn(console, 'log')
      cli.execute('instance list db')
      expect(console.log.argsForCall).toEqual [
        ['db_01']
        ['db_02']
      ]

  describe 'remove', ->
    beforeEach ->
      spyOn(utils, 'handleInstanceNotFound')
      spyOn(utils, 'deleteInstance')

    it 'should fail if name is missing', ->
      cli.execute('instance remove')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should remove existing empty clusters', ->
      cli.execute('instance remove dummy01')
      expect(utils.deleteInstance.mostRecentCall.args[0].name).toEqual 'dummy01'

  describe 'update', ->
    it 'should fail if name is missing', ->
      cli.execute('instance update')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if --cluster is not found', ->
      cli.execute('instance update dummy01 --cluster missing')
      expect(utils.die.mostRecentCall.args[0]).toContain('No "missing" cluster found')

    it 'should fail if the renamed instance already exists in the same cluster', ->
      cli.execute('instance update db_01 --name db_02')
      expect(utils.die.mostRecentCall.args[0]).toContain('An instance named "db_02" already exists in the "db" cluster')

    it 'should fail if the renamed instance already exists in the same cluster', ->
      cli.execute('instance update db_01 --name dummy01 --cluster dummy')
      expect(utils.die.mostRecentCall.args[0]).toContain('An instance named "dummy01" already exists in the "dummy" cluster')

    it 'should be able to rename the instance', ->
      cli.execute('instance update dummy01 --name dummy02 --ip 127.0.0.2')
      expect(utils.saveClusters.mostRecentCall.args[0].dummy.instances.dummy01).toBe undefined
      savedInstance = utils.saveClusters.mostRecentCall.args[0].dummy.instances.dummy02
      expect(savedInstance.name).toBe 'dummy02'
      expect(savedInstance.ip).toBe '127.0.0.2'

    it 'should be able to move the instance to a different cluster', ->
      cli.execute('instance update dummy01 --cluster empty --ip 127.0.0.2')
      expect(utils.saveClusters.mostRecentCall.args[0].dummy.instances.dummy01).toBe undefined
      savedInstance = utils.saveClusters.mostRecentCall.args[0].empty.instances.dummy01
      expect(savedInstance.name).toBe 'dummy01'
      expect(savedInstance.ip).toBe '127.0.0.2'
