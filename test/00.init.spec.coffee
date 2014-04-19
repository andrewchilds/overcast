utils = require('./utils')
overcast = utils.overcast

describe 'init', ->

  it 'should allow me to init in the cwd', ->
    overcast 'init', (stdout) ->
      expect(stdout).toContain ''

  it 'should tell me if a config directory already exists', ->
    overcast 'init', (stdout) ->
      expect(stdout).toContain '.overcast directory already exists here.'
