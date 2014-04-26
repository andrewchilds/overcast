push = require('../../modules/commands/push')
scp = require('../../modules/scp')
utils = require('../../modules/utils')
mockArgs = require('./utils').mockArgs

describe 'push', ->

  describe 'run', ->
    subject = push.run

    beforeEach ->
      spyOn(utils, 'missingParameter')
      spyOn(scp, 'run')

    it 'should throw an error if name is missing', ->
      subject(mockArgs('push'))
      expect(utils.missingParameter).toHaveBeenCalled()
      expect(scp.run).not.toHaveBeenCalled()

    it 'should throw an error if source is missing', ->
      subject(mockArgs('push myInstance'))
      expect(utils.missingParameter).toHaveBeenCalled()
      expect(scp.run).not.toHaveBeenCalled()

    it 'should throw an error if dest is missing', ->
      subject(mockArgs('push myInstance /path/to/src'))
      expect(utils.missingParameter).toHaveBeenCalled()
      expect(scp.run).not.toHaveBeenCalled()

    it 'should call scp if everything exists', ->
      subject(mockArgs('push myInstance /path/to/src /path/to/dest'))
      expect(scp.run).toHaveBeenCalledWith({
        _: []
        command: 'push'
        name: 'myInstance'
        source: '/path/to/src'
        dest: '/path/to/dest'
        direction: 'push'
      })
