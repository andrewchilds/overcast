utils = require('../../modules/utils')
instance = require('../../modules/commands/instance')
mockArgs = require('./utils').mockArgs

describe 'instance', ->

  beforeEach ->
    spyOn(utils, 'getClusters').andReturn({
        dummy: {
          instances: {
            dummy01: {
              name: 'dummy01'
              ip: '127.0.0.1'
            }
          }
        }
        db: {
          instances: {
            db_01: {
              name: 'db_01'
              ip: '1.1.1.1'
            }
            db_02: {
              name: 'db_02'
              ip: '2.2.2.2'
            }
          }
        }
        empty: {
          instances: {}
        }
      })
    spyOn(utils, 'saveClusters').andCallFake (clusters, callback) -> callback()
    spyOn(utils, 'missingParameter')
    spyOn(utils, 'missingCommand')
    spyOn(utils, 'die')

  describe 'run', ->
    subject = instance.run

    it 'should fail if command is missing', ->
      subject(mockArgs('instance'))
      expect(utils.missingCommand).toHaveBeenCalled()

  describe 'get', ->
    subject = instance.run

    it 'should fail if name is missing', ->
      subject(mockArgs('instance get'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should fail if attribute is missing', ->
      subject(mockArgs('instance get foo'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should return the requested instance attribute', ->
      spyOn(console, 'log')
      subject(mockArgs('instance get dummy name ip'))
      expect(console.log.argsForCall[0]).toEqual [ 'dummy01' ]
      expect(console.log.argsForCall[1]).toEqual [ '127.0.0.1' ]

    it 'should return the requested cluster attribute', ->
      spyOn(console, 'log')
      subject(mockArgs('instance get all ip'))
      expect(console.log.argsForCall).toEqual [
        [ '127.0.0.1' ]
        [ '1.1.1.1' ]
        [ '2.2.2.2' ]
      ]

  describe 'import', ->
    subject = instance.run

    it 'should fail if name is missing', ->
      subject(mockArgs('instance import'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should fail if --ip is missing', ->
      subject(mockArgs('instance import dummy02'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should fail if cluster was not found', ->
      subject(mockArgs('instance import dummy02 --cluster missing --ip 127.0.0.2'))
      expect(utils.die.mostRecentCall.args[0]).toContain('No "missing" cluster found')

    it 'should fail if name already exists in cluster', ->
      subject(mockArgs('instance import dummy01 --cluster dummy --ip 127.0.0.2'))
      expect(utils.die.mostRecentCall.args[0]).toContain('Instance "dummy01" already exists')

    it 'otherwise it should import the instance', ->
      subject(mockArgs('instance import dummy02 --cluster dummy --ip 127.0.0.2'))
      savedInstance = utils.saveClusters.mostRecentCall.args[0].dummy.instances.dummy02
      expect(savedInstance.name).toBe 'dummy02'
      expect(savedInstance.ip).toBe '127.0.0.2'
      expect(savedInstance.ssh_port).toBe '22'
      expect(savedInstance.user).toBe 'root'

  describe 'list', ->
    subject = instance.run

    it 'should list the instances', ->
      spyOn(console, 'log')
      subject(mockArgs('instance list'))
      expect(console.log.argsForCall).toEqual [
        [ 'dummy01' ]
        [ 'db_01' ]
        [ 'db_02' ]
      ]

  describe 'remove', ->
    subject = instance.run

    it 'should fail if name is missing', ->
      subject(mockArgs('instance remove'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should fail if name is not a cluster', ->
      subject(mockArgs('instance remove foo'))
      expect(utils.die.mostRecentCall.args[0]).toContain('No instance found with the name "foo".')

    it 'should remove existing empty clusters', ->
      subject(mockArgs('instance remove dummy01'))
      expect(utils.saveClusters).toHaveBeenCalled()
      expect(utils.saveClusters.mostRecentCall.args[0].dummy.instances).toEqual {}

  describe 'update', ->
    subject = instance.run

    it 'should fail if name is missing', ->
      subject(mockArgs('instance update'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should fail if --cluster is not found', ->
      subject(mockArgs('instance update dummy01 --cluster missing'))
      expect(utils.die.mostRecentCall.args[0]).toContain('No "missing" cluster found')

    it 'should fail if the renamed instance already exists in the same cluster', ->
      subject(mockArgs('instance update db_01 --name db_02'))
      expect(utils.die.mostRecentCall.args[0]).toContain('An instance named "db_02" already exists in the "db" cluster')

    it 'should fail if the renamed instance already exists in the same cluster', ->
      subject(mockArgs('instance update db_01 --name dummy01 --cluster dummy'))
      expect(utils.die.mostRecentCall.args[0]).toContain('An instance named "dummy01" already exists in the "dummy" cluster')

    it 'should be able to rename the instance', ->
      subject(mockArgs('instance update dummy01 --name dummy02 --ip 127.0.0.2'))
      expect(utils.saveClusters.mostRecentCall.args[0].dummy.instances.dummy01).toBe undefined
      savedInstance = utils.saveClusters.mostRecentCall.args[0].dummy.instances.dummy02
      expect(savedInstance.name).toBe 'dummy02'
      expect(savedInstance.ip).toBe '127.0.0.2'

    it 'should be able to move the instance to a different cluster', ->
      subject(mockArgs('instance update dummy01 --cluster empty --ip 127.0.0.2'))
      expect(utils.saveClusters.mostRecentCall.args[0].dummy.instances.dummy01).toBe undefined
      savedInstance = utils.saveClusters.mostRecentCall.args[0].empty.instances.dummy01
      expect(savedInstance.name).toBe 'dummy01'
      expect(savedInstance.ip).toBe '127.0.0.2'
