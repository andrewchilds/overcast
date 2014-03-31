utils = require('./utils')
overcast = utils.overcast

describe 'cluster', ->

  it 'should allow me to create a new cluster', ->
    overcast 'cluster create app', (stdout) ->
      expect(stdout).toContain 'Cluster "app" has been created'

  it 'should not allow me to create an already existing cluster', ->
    overcast 'cluster create app', (stdout) ->
      expect(stdout).toContain 'The cluster "app" already exists'

  it 'should allow me to remove an existing cluster', ->
    overcast 'cluster remove app', (stdout) ->
      expect(stdout).toContain 'Cluster "app" has been removed'

  it 'should not let me remove a cluster that does not exist', ->
    overcast 'cluster remove app', (stdout) ->
      expect(stdout).toContain 'The cluster "app" wasn\'t found'
