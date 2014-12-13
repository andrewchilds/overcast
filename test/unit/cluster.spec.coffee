cli = require('../../modules/cli')
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
    spyOn(cli, 'missingArgument')
    spyOn(cli, 'missingCommand')
    spyOn(utils, 'dieWithList')
    spyOn(utils, 'grey')

  describe 'run', ->
    it 'should fail if command is missing', ->
      cli.execute('cluster')
      expect(cli.missingCommand).toHaveBeenCalled()

  describe 'count', ->
    it 'should fail if name is missing', ->
      cli.execute('cluster count')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if name is not a cluster', ->
      cli.execute('cluster count foo')
      expect(utils.dieWithList.mostRecentCall.args[0]).toContain('No clusters found matching "foo"')

    it 'should return 0 for empty clusters', ->
      spyOn(console, 'log')
      cli.execute('cluster count empty')
      expect(console.log.mostRecentCall.args[0]).toBe 0

    it 'should return the instance count for non-empty clusters', ->
      spyOn(console, 'log')
      cli.execute('cluster count dummy')
      expect(console.log.mostRecentCall.args[0]).toBe 1

  describe 'create', ->
    it 'should fail if name is missing', ->
      cli.execute('cluster create')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should do nothing if cluster already exists', ->
      cli.execute('cluster create dummy')
      expect(utils.grey.mostRecentCall.args[0]).toContain('already exists')

    it 'should save the new cluster definition', ->
      cli.execute('cluster create new')
      expect(utils.saveClusters.mostRecentCall.args[0].new).toEqual({
        instances: {}
      })

  describe 'rename', ->
    it 'should fail if name is missing', ->
      cli.execute('cluster rename')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if new-name is missing', ->
      cli.execute('cluster rename dummy')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if name is not a cluster', ->
      cli.execute('cluster rename foo bar')
      expect(cli.missingArgument).not.toHaveBeenCalled()
      expect(utils.dieWithList.mostRecentCall.args[0]).toContain('No clusters found matching "foo"')

    it 'should fail if new-name already exists', ->
      cli.execute('cluster rename empty dummy')
      expect(cli.missingArgument).not.toHaveBeenCalled()
      expect(utils.grey.mostRecentCall.args[0]).toContain('"dummy" already exists')

    it 'should save the renamed cluster definition', ->
      cli.execute('cluster rename empty foo')
      expect(utils.saveClusters.mostRecentCall.args[0].empty).toBe undefined
      expect(utils.saveClusters.mostRecentCall.args[0].foo).toEqual({
        instances: {}
      })

  describe 'remove', ->
    it 'should fail if name is missing', ->
      cli.execute('cluster remove')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if name is not a cluster', ->
      cli.execute('cluster remove foo')
      expect(utils.dieWithList.mostRecentCall.args[0]).toContain('No clusters found matching "foo"')

    it 'should remove existing empty clusters', ->
      cli.execute('cluster remove empty')
      expect(utils.saveClusters.mostRecentCall.args[0].empty).toBe undefined
      expect(utils.saveClusters.mostRecentCall.args[0].orphaned).toBe undefined

    it 'should remove existing clusters and move instances to the "orphaned" cluster', ->
      cli.execute('cluster remove dummy')
      expect(utils.saveClusters.mostRecentCall.args[0].dummy).toBe undefined
      expect(utils.saveClusters.mostRecentCall.args[0].orphaned.instances).toEqual({
        dummy01: {
          name: 'dummy01'
        }
      })
