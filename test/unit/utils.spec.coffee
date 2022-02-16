path = require('path')
utils = require('../../src/utils')

beforeEach ->
  utils.setConfigDir(utils.getFileDirname() + '/.overcast')

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
      expect(subject()).toBe path.resolve(store.getConfigDir(), 'keys', 'overcast.key')

    it 'should handle absolute paths', ->
      expect(subject('/path/to/overcast.key')).toBe '/path/to/overcast.key'

    it 'should handle relative paths', ->
      expect(subject('foo.key')).toBe path.resolve(store.getConfigDir(), 'keys', 'foo.key')

  describe 'convertToAbsoluteFilePath', ->
    subject = utils.convertToAbsoluteFilePath

    it 'should resolve and normalize relative paths', ->
      expect(subject('file')).toBe path.resolve(store.getConfigDir(), 'files', 'file')

    it 'should normalize absolute paths', ->
      expect(subject('/path/to/file')).toBe '/path/to/file'

  describe 'tokenize', ->
    subject = utils.tokenize

    it 'should handle double-quoted tokens', ->
      expect(subject('"my first token" second, third')).toEqual [
        'my first token'
        'second,'
        'third'
      ]

    it 'should handle single-quotes in double-quoted tokens and vice-versa', ->
      expect(subject('"first token\'s value" \'second "token quote"\' third')).toEqual [
        'first token\'s value'
        'second "token quote"'
        'third'
      ]

    it 'should handle single-quoted tokens', ->
      expect(subject('"my first token" \'my second token\' third')).toEqual [
        'my first token'
        'my second token'
        'third'
      ]

    it 'should handle simple tokens with irregular spacing', ->
      expect(subject(' first  second --third')).toEqual [
        'first'
        'second'
        '--third'
      ]

  describe 'sanitize', ->
    subject = utils.sanitize

    it 'should sanitize the input string', ->
      expect(subject('foo ~`!@#$%^&*()-=_+[]\\{}|;:\'",./<>?bar')).toBe 'foo *-_.bar'

    it 'should handle numbers', ->
      expect(subject(12345)).toBe '12345'

    it 'should return empty strings for null and undefined', ->
      expect(subject(null)).toBe ''
      expect(subject()).toBe ''
