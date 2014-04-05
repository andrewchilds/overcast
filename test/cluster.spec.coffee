utils = require('./utils')
overcast = utils.overcast

describe 'cluster', ->

  describe 'create', ->

    it 'should allow me to create a new cluster', ->
      overcast 'cluster create app', (stdout) ->
        expect(stdout).toContain 'Cluster "app" has been created'

    it 'should not allow me to create an already existing cluster', ->
      overcast 'cluster create app', (stdout) ->
        expect(stdout).toContain 'The cluster "app" already exists'

  describe 'count', ->
    it 'should not return the instance count for a missing cluster', ->
      overcast 'cluster count missing-cluster', (stdout) ->
        expect(stdout).toContain 'The cluster "missing-cluster" wasn\'t found.'

    it 'should return the instance count for an existing cluster', ->
      overcast 'cluster count app', (stdout) ->
        expect(stdout).toContain '0' # stdout contains a /n

  describe 'rename', ->

    it 'should allow me to rename an existing cluster', ->
      overcast 'cluster rename app foo', (stdout) ->
        expect(stdout).toContain 'Cluster "app" has been renamed to "foo"'

    it 'should not allow me to rename a cluster that does not exist', ->
      overcast 'cluster rename app foo', (stdout) ->
        expect(stdout).toContain 'The cluster "app" wasn\'t found'

  describe 'remove', ->

    it 'should allow me to remove an existing cluster', ->
      overcast 'cluster remove foo', (stdout) ->
        expect(stdout).toContain 'Cluster "foo" has been removed'

    it 'should not let me remove a cluster that does not exist', ->
      overcast 'cluster remove app', (stdout) ->
        expect(stdout).toContain 'The cluster "app" wasn\'t found'
