utils = require('./utils')
overcast = utils.overcast

describe 'var', ->

  describe 'set', ->
    it 'should set vars', ->
      overcast 'var set TEST_NAME test_value', ->
        overcast 'var get TEST_NAME', (stdout) ->
          expect(stdout).toContain 'test_value'

  describe 'get', ->
    it 'should get vars', ->
      overcast 'var get TEST_NAME', (stdout) ->
        expect(stdout).toContain 'test_value'

    it 'should handle missing vars', ->
      overcast 'var get BOGUS', (stdout) ->
        expect(stdout).toContain 'Variable not found'

  describe 'delete', ->
    it 'should delete vars', ->
      overcast 'var delete TEST_NAME', ->
        overcast 'var get TEST_NAME', (stdout) ->
          expect(stdout).toContain 'Variable not found'

    it 'should handle missing vars', ->
      overcast 'var delete TEST_NAME', (stdout) ->
        expect(stdout).toContain 'Variable not found'
