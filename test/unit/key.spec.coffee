fs = require('fs')
cli = require('../../src/cli')
utils = require('../../src/utils')
key = require('../../src/commands/key')

describe 'key', ->

  beforeEach ->
    spyOn(utils, 'getClusters').andReturn({
        default: {
          instances: {
            vm01: {
              name: 'vm01',
              ip: '1.2.3.4',
              ssh_key: 'overcast.key',
              ssh_port: '22',
              user: 'root'
            }
          }
        }
      })
    spyOn(cli, 'missingArgument')
    spyOn(utils, 'die')
    spyOn(utils, 'dieWithList')

  describe 'create', ->
    it 'should fail if name is missing', ->
      cli.execute('key create')
      expect(cli.missingArgument).toHaveBeenCalled()

    describe 'key exists', ->
      beforeEach ->
        spyOn(utils, 'keyExists').andReturn true

      it 'should do nothing', ->
        spyOn(utils, 'grey')
        cli.execute('key create dummyKey')
        expect(utils.grey.mostRecentCall.args[0]).toContain('"dummyKey" already exists')

    describe 'key does not exist', ->
      beforeEach ->
        spyOn(utils, 'keyExists').andReturn false

      it 'should save the new key', ->
        spyOn(utils, 'createKey')
        cli.execute('key create dummyKey')
        expect(utils.createKey).toHaveBeenCalledWith('dummyKey', jasmine.any(Function))

  describe 'delete', ->
    it 'should fail if name is missing', ->
      cli.execute('key delete')
      expect(cli.missingArgument).toHaveBeenCalled()

    describe 'key does not exist', ->
      beforeEach ->
        spyOn(utils, 'keyExists').andReturn false

      it 'should do nothing', ->
        spyOn(utils, 'grey')
        cli.execute('key delete dummyKey')
        expect(utils.grey.mostRecentCall.args[0]).toContain('"dummyKey" was not found')

    describe 'key exists', ->
      beforeEach ->
        spyOn(utils, 'keyExists').andReturn true

      it 'should delete the key', ->
        spyOn(utils, 'deleteKey')
        cli.execute('key delete dummyKey')
        expect(utils.deleteKey).toHaveBeenCalledWith('dummyKey', jasmine.any(Function))

  describe 'get', ->
    it 'should fail if name is missing', ->
      cli.execute('key delete')
      expect(cli.missingArgument).toHaveBeenCalled()

    describe 'key does not already exist', ->
      beforeEach ->
        spyOn(utils, 'keyExists').andReturn false

      it 'should do nothing', ->
        spyOn(utils, 'grey')
        cli.execute('key get dummyKey')
        expect(utils.grey.mostRecentCall.args[0]).toContain('"dummyKey" was not found')

    describe 'key exists', ->
      beforeEach ->
        spyOn(console, 'log')
        spyOn(utils, 'getKeyFileFromName').andReturn '/path/to/.overcast/dummyKey.key'
        spyOn(utils, 'keyExists').andReturn true
        spyOn(fs, 'readFile').andCallFake (file, fn) ->
          fn(null, 'KEY_DATA')

      it 'should handle --private-data', ->
        cli.execute('key get dummyKey --private-data')
        expect(console.log).toHaveBeenCalledWith('KEY_DATA')

      it 'should handle --public-data', ->
        cli.execute('key get dummyKey --public-data')
        expect(console.log).toHaveBeenCalledWith('KEY_DATA')

      it 'should handle --private-path', ->
        cli.execute('key get dummyKey --private-path')
        expect(console.log).toHaveBeenCalledWith('/path/to/.overcast/dummyKey.key')

      it 'should handle --public-path', ->
        cli.execute('key get dummyKey --public-path')
        expect(console.log).toHaveBeenCalledWith('/path/to/.overcast/dummyKey.key.pub')

  describe 'list', ->
    beforeEach ->
      spyOn(fs, 'readdir').andCallFake (path, fn) ->
        fn(null, ['dummy.key', 'dummy.key.pub', 'overcast.key', 'overcast.key.pub'])

    it 'should list the key names', ->
      spyOn(console, 'log')
      cli.execute('key list')
      expect(console.log.argsForCall[0][0]).toBe 'dummy'
      expect(console.log.argsForCall[1][0]).toBe 'overcast'

  describe 'push', ->
    it 'should fail if instance name is missing', ->
      cli.execute('key push')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if key path is missing', ->
      cli.execute('key push vm01')
      expect(cli.missingArgument).toHaveBeenCalled()

    it 'should fail if instance does not exist', ->
      cli.execute('key push vm99 myKeyName')
      expect(utils.dieWithList).toHaveBeenCalled()
