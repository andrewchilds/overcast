utils = require('../../modules/utils')
cluster = require('../../modules/commands/cluster')
mockArgs = require('./utils').mockArgs

describe 'cluster', ->

  beforeEach ->
    spyOn(utils, 'getClusters').andReturn({
        dummy: {
          instances: {
            dummy01: {
              name: 'dummy01'
            }
          }
        }
        empty: {
          instances: {}
        }
      })
    spyOn(utils, 'saveClusters')
    spyOn(utils, 'missingParameter')
    spyOn(utils, 'missingCommand')
    spyOn(utils, 'die')

  describe 'run', ->
    subject = cluster.run

    it 'should fail if command is missing', ->
      subject(mockArgs('clusters'))
      expect(utils.missingCommand).toHaveBeenCalled()

  describe 'count', ->
    subject = cluster.run

    it 'should fail if name is missing', ->
      subject(mockArgs('clusters count'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should fail if name is not a cluster', ->
      subject(mockArgs('clusters count foo'))
      expect(utils.die.mostRecentCall.args[0]).toContain('"foo" wasn\'t found')

    it 'should return 0 for empty clusters', ->
      spyOn(console, 'log')
      subject(mockArgs('clusters count empty'))
      expect(console.log.mostRecentCall.args[0]).toBe 0

    it 'should return the instance count for non-empty clusters', ->
      spyOn(console, 'log')
      subject(mockArgs('clusters count dummy'))
      expect(console.log.mostRecentCall.args[0]).toBe 1

  describe 'create', ->
    subject = cluster.run

    it 'should fail if name is missing', ->
      subject(mockArgs('clusters create'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should do nothing if cluster already exists', ->
      spyOn(utils, 'grey')
      subject(mockArgs('clusters create dummy'))
      expect(utils.grey.mostRecentCall.args[0]).toContain('already exists')

    it 'should save the new cluster definition', ->
      subject(mockArgs('clusters create new'))
      expect(utils.saveClusters.mostRecentCall.args[0].new).toEqual({
        instances: {}
      })

  describe 'rename', ->
    subject = cluster.run

    it 'should fail if name is missing', ->
      subject(mockArgs('clusters rename'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should fail if new-name is missing', ->
      subject(mockArgs('clusters rename dummy'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should fail if name is not a cluster', ->
      subject(mockArgs('clusters rename foo bar'))
      expect(utils.missingParameter).not.toHaveBeenCalled()
      expect(utils.die.mostRecentCall.args[0]).toContain('"foo" wasn\'t found')

    it 'should fail if new-name already exists', ->
      subject(mockArgs('clusters rename empty dummy'))
      expect(utils.missingParameter).not.toHaveBeenCalled()
      expect(utils.die.mostRecentCall.args[0]).toContain('"dummy" already exists')

    it 'should save the renamed cluster definition', ->
      subject(mockArgs('clusters rename empty foo'))
      expect(utils.saveClusters.mostRecentCall.args[0].empty).toBe undefined
      expect(utils.saveClusters.mostRecentCall.args[0].foo).toEqual({
        instances: {}
      })

  describe 'remove', ->
    subject = cluster.run

    it 'should fail if name is missing', ->
      subject(mockArgs('clusters remove'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should fail if name is not a cluster', ->
      subject(mockArgs('clusters remove foo'))
      expect(utils.die.mostRecentCall.args[0]).toContain('"foo" wasn\'t found')

    it 'should remove existing empty clusters', ->
      subject(mockArgs('clusters remove empty'))
      expect(utils.saveClusters.mostRecentCall.args[0].empty).toBe undefined
      expect(utils.saveClusters.mostRecentCall.args[0].orphaned).toBe undefined

    it 'should remove existing clusters and move instances to the "orphaned" cluster', ->
      subject(mockArgs('clusters remove dummy'))
      expect(utils.saveClusters.mostRecentCall.args[0].dummy).toBe undefined
      expect(utils.saveClusters.mostRecentCall.args[0].orphaned.instances).toEqual({
        dummy01: {
          name: 'dummy01'
        }
      })
