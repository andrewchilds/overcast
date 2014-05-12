utils = require('../../modules/utils')

beforeEach ->
  utils.setConfigDir(__dirname + '/.overcast')

describe 'utils', ->

  describe 'findMatchingInstances', ->
    subject = utils.findMatchingInstances

    beforeEach ->
      spyOn(utils, 'getClusters').andReturn({
        dummy: {
          instances: {
            'dummy.01': { name: 'dummy.01' }
            'dummy.02': { name: 'dummy.02' }
          }
        }
        test: {
          instances: {
            'test-01': { name: 'test-01' }
            'test-02': { name: 'test-02' }
            'test-03': { name: 'test-03' }
          }
        }
      })

    describe 'name is all', ->
      it 'should return all instances', ->
        expect(subject('all')).toEqual([
          { name: 'dummy.01' }
          { name: 'dummy.02' }
          { name: 'test-01' }
          { name: 'test-02' }
          { name: 'test-03' }
        ])

    describe 'name matches a cluster', ->
      it 'should return all instances from that cluster', ->
        expect(subject('dummy')).toEqual([
          { name: 'dummy.01' }
          { name: 'dummy.02' }
        ])

    describe 'name matches an instance', ->
      it 'should return the matching instance', ->
        expect(subject('test-03')).toEqual([
          { name: 'test-03' }
        ])

    describe 'name includes a wildcard', ->
      it 'should return the matching instances', ->
        expect(subject('test-0*')).toEqual([
          { name: 'test-01' }
          { name: 'test-02' }
          { name: 'test-03' }
        ])
        expect(subject('*01')).toEqual([
          { name: 'dummy.01' }
          { name: 'test-01' }
        ])
        expect(subject('*.*')).toEqual([
          { name: 'dummy.01' }
          { name: 'dummy.02' }
        ])

  describe 'findFirstMatchingInstance', ->
    subject = utils.findFirstMatchingInstance

    beforeEach ->
      spyOn(utils, 'getClusters').andReturn({
        dummy: {
          instances: {
            'dummy.01': { name: 'dummy.01' }
            'dummy.02': { name: 'dummy.02' }
          }
        }
      })

    describe 'name does not match an instance', ->
      it 'should return undefined', ->
        expect(subject('dummy.03')).toBe undefined

    describe 'name matches an instance', ->
      it 'should return the matching instance', ->
        expect(subject('dummy.02')).toEqual({ name: 'dummy.02' })

    describe 'name includes a wildcard', ->
      it 'should return the first matching instances', ->
        expect(subject('dummy.0*')).toEqual({ name: 'dummy.01' })

  describe 'normalizeKeyPath', ->
    subject = utils.normalizeKeyPath

    it 'should use the default path if none specified', ->
      expect(subject()).toBe utils.CONFIG_DIR + '/keys/overcast.key'

    it 'should handle absolute paths', ->
      expect(subject('/path/to/overcast.key')).toBe '/path/to/overcast.key'

    it 'should handle relative paths', ->
      expect(subject('foo.key')).toBe utils.CONFIG_DIR + '/keys/foo.key'

  describe 'sanitize', ->
    subject = utils.sanitize

    it 'should sanitize the input string', ->
      expect(subject('foo ~`!@#$%^&*()-=_+[]\\{}|;:\'",./<>?bar')).toBe 'foo *-_.bar'

    it 'should handle numbers', ->
      expect(subject(12345)).toBe '12345'

    it 'should return empty strings for null and undefined', ->
      expect(subject(null)).toBe ''
      expect(subject()).toBe ''
