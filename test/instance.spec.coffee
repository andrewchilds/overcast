utils = require('./utils')
overcast = utils.overcast

describe 'instance', ->

  describe 'import', ->

    it 'should not allow me to import an instance without all of the required details', ->
      overcast 'instance import', (stdout) ->
        expect(stdout).toContain 'Missing [name] parameter'
      overcast 'instance import instance.01', (stdout) ->
        expect(stdout).toContain 'Missing --cluster parameter'
      overcast 'instance import instance.01 --cluster=missing-cluster', (stdout) ->
        expect(stdout).toContain 'Missing --ip parameter'
      overcast 'instance import instance.01 --cluster=missing-cluster --ip=127.0.0.1', (stdout) ->
        expect(stdout).toContain 'No "missing-cluster" cluster found'

    it 'should allow me to import an instance', ->
      overcast 'cluster create instance-test', ->
        overcast 'instance import instance.01 --cluster=instance-test --ip=127.0.0.1', (stdout) ->
          expect(stdout).toContain 'Instance "instance.01" (127.0.0.1) has been imported ' +
          'to the "instance-test" cluster'

  describe 'list', ->

    it 'should display that instance with the list command', ->
      overcast 'list', (stdout) ->
        expect(stdout).toContain 'instance.01 (127.0.0.1:22)'

  describe 'remove', ->

    it 'should move the instance to the "orphaned" cluster when the parent cluster is deleted', ->
      overcast 'cluster remove instance-test', (stdout) ->
        expect(stdout).toContain 'Cluster "instance-test" has been removed'
        expect(stdout).toContain 'All instances from this cluster were moved to the "orphaned" cluster.'

        overcast 'list', (stdout) ->
          expect(stdout).toContain 'instance.01 (127.0.0.1:22)'

    it 'should allow me to remove an instance', ->
      overcast 'instance remove instance.01', (stdout) ->
        expect(stdout).toContain 'Instance "instance.01" has been deleted from the "orphaned" cluster'

        overcast 'cluster remove orphaned', (stdout) ->
          expect(stdout).toContain 'Cluster "orphaned" has been removed'
