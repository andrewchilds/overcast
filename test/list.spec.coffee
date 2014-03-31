utils = require('./utils')
overcast = utils.overcast

describe 'list', ->

  it 'should display nothing when no clusters are defined', ->
    overcast 'list', (stdout) ->
      expect(stdout).toContain 'No clusters found'

  it 'should display info when clusters are defined', ->
    overcast 'cluster create list-test', ->
      overcast 'list', (stdout) ->
        expect(stdout).toContain 'list-test'

  it 'should display nothing after the test cluster is removed', ->
    overcast 'cluster remove list-test', ->
      overcast 'list', (stdout) ->
        expect(stdout).toContain 'No clusters found'
