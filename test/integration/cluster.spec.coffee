utils = require('./utils')
overcast = utils.overcast

describe 'cluster', ->

  describe 'create', ->

    it 'should allow me to create a new cluster', ->
      overcast 'cluster create app', (stdout) ->
        expect(stdout).toContain 'Cluster "app" has been created'

  describe 'count', ->
    it 'should return the instance count for an existing cluster', ->
      overcast 'cluster count app', (stdout) ->
        expect(stdout).toContain '0' # stdout contains a /n

  describe 'rename', ->

    it 'should allow me to rename an existing cluster', ->
      overcast 'cluster rename app foo', (stdout) ->
        expect(stdout).toContain 'Cluster "app" has been renamed to "foo"'

  describe 'remove', ->

    it 'should allow me to remove an existing cluster', ->
      overcast 'cluster remove foo', (stdout) ->
        expect(stdout).toContain 'Cluster "foo" has been removed'
