utils = require('../../modules/utils')

beforeEach ->
  utils.setConfigDir(__dirname + '/.overcast')

describe 'utils', ->

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
      expect(subject('foo ~`!@#$%^&*()-=_+[]\\{}|;:\'",./<>?bar')).toBe 'foo -_.bar'

    it 'should handle numbers', ->
      expect(subject(12345)).toBe '12345'

    it 'should return empty strings for null and undefined', ->
      expect(subject(null)).toBe ''
      expect(subject()).toBe ''
