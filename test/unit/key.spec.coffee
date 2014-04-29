fs = require('fs')
utils = require('../../modules/utils')
key = require('../../modules/commands/key')
mockArgs = require('./utils').mockArgs

describe 'key', ->

  beforeEach ->
    spyOn(utils, 'missingParameter')
    spyOn(utils, 'missingCommand')
    spyOn(utils, 'die')

  describe 'run', ->
    subject = key.run

    it 'should fail if command is missing', ->
      subject(mockArgs('key'))
      expect(utils.missingCommand).toHaveBeenCalled()

  describe 'create', ->
    subject = key.run

    it 'should fail if name is missing', ->
      subject(mockArgs('key create'))
      expect(utils.missingParameter).toHaveBeenCalled()

    describe 'key exists', ->
      beforeEach ->
        spyOn(utils, 'keyExists').andReturn true

      it 'should do nothing', ->
        spyOn(utils, 'grey')
        subject(mockArgs('key create dummyKey'))
        expect(utils.grey.mostRecentCall.args[0]).toContain('"dummyKey" already exists')

    describe 'key does not exist', ->
      beforeEach ->
        spyOn(utils, 'keyExists').andReturn false

      it 'should save the new key', ->
        spyOn(utils, 'createKey')
        subject(mockArgs('key create dummyKey'))
        expect(utils.createKey).toHaveBeenCalledWith('dummyKey', jasmine.any(Function))

  describe 'delete', ->
    subject = key.run

    it 'should fail if name is missing', ->
      subject(mockArgs('key delete'))
      expect(utils.missingParameter).toHaveBeenCalled()

    describe 'key does not exist', ->
      beforeEach ->
        spyOn(utils, 'keyExists').andReturn false

      it 'should do nothing', ->
        spyOn(utils, 'grey')
        subject(mockArgs('key delete dummyKey'))
        expect(utils.grey.mostRecentCall.args[0]).toContain('"dummyKey" was not found')

    describe 'key exists', ->
      beforeEach ->
        spyOn(utils, 'keyExists').andReturn true

      it 'should delete the key', ->
        spyOn(utils, 'deleteKey')
        subject(mockArgs('key delete dummyKey'))
        expect(utils.deleteKey).toHaveBeenCalledWith('dummyKey', jasmine.any(Function))

  describe 'get', ->
    subject = key.run

    it 'should fail if name is missing', ->
      subject(mockArgs('key delete'))
      expect(utils.missingParameter).toHaveBeenCalled()

    describe 'key does not already exist', ->
      beforeEach ->
        spyOn(utils, 'keyExists').andReturn false

      it 'should do nothing', ->
        spyOn(utils, 'grey')
        subject(mockArgs('key get dummyKey'))
        expect(utils.grey.mostRecentCall.args[0]).toContain('"dummyKey" was not found')

    describe 'key exists', ->
      beforeEach ->
        spyOn(console, 'log')
        spyOn(utils, 'getKeyFileFromName').andReturn '/path/to/.overcast/dummyKey.key'
        spyOn(utils, 'keyExists').andReturn true
        spyOn(fs, 'readFile').andCallFake (file, fn) ->
          fn(null, 'KEY_DATA')

      it 'should handle --private-data', ->
        subject(mockArgs('key get dummyKey --private-data'))
        expect(console.log).toHaveBeenCalledWith('KEY_DATA')

      it 'should handle --public-data', ->
        subject(mockArgs('key get dummyKey --public-data'))
        expect(console.log).toHaveBeenCalledWith('KEY_DATA')

      it 'should handle --private-path', ->
        subject(mockArgs('key get dummyKey --private-path'))
        expect(console.log).toHaveBeenCalledWith('/path/to/.overcast/dummyKey.key')

      it 'should handle --public-path', ->
        subject(mockArgs('key get dummyKey --public-path'))
        expect(console.log).toHaveBeenCalledWith('/path/to/.overcast/dummyKey.key.pub')

  describe 'list', ->
    subject = key.run

    beforeEach ->
      spyOn(fs, 'readdir').andCallFake (path, fn) ->
        fn(null, ['dummy.key', 'dummy.key.pub', 'overcast.key', 'overcast.key.pub'])

    it 'should list the key names', ->
      spyOn(console, 'log')
      subject(mockArgs('key list'))
      expect(console.log.argsForCall[0][0]).toBe 'dummy'
      expect(console.log.argsForCall[1][0]).toBe 'overcast'
