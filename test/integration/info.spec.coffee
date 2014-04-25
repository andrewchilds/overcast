utils = require('./utils')
overcast = utils.overcast

describe 'info', ->

  it 'should display nothing when no clusters are defined', ->
    overcast 'info', (stdout) ->
      expect(stdout).toContain 'No clusters found'

  it 'should display info when clusters and instances are defined', ->
    overcast 'cluster create info-test', ->
      overcast 'instance import info.01 --cluster info-test ' +
      '--ip 127.0.0.1', ->
        overcast 'info', (stdout) ->
          expect(stdout).toContain 'info-test'

  it 'should display nothing after the test cluster is removed', ->
    overcast 'instance remove info.01', ->
      overcast 'cluster remove info-test', ->
        overcast 'info', (stdout) ->
          expect(stdout).toContain 'No clusters found'
