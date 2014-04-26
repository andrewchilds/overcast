pull = require('../../modules/commands/pull')
scp = require('../../modules/scp')
utils = require('../../modules/utils')
mockArgs = require('./utils').mockArgs

describe 'pull', ->

  describe 'run', ->
    subject = pull.run

    beforeEach ->
      spyOn(utils, 'missingParameter')
      spyOn(scp, 'run')

    it 'should throw an error if name is missing', ->
      subject(mockArgs('pull'))
      expect(utils.missingParameter).toHaveBeenCalled()
      expect(scp.run).not.toHaveBeenCalled()

    it 'should throw an error if source is missing', ->
      subject(mockArgs('pull myInstance'))
      expect(utils.missingParameter).toHaveBeenCalled()
      expect(scp.run).not.toHaveBeenCalled()

    it 'should throw an error if dest is missing', ->
      subject(mockArgs('pull myInstance /path/to/src'))
      expect(utils.missingParameter).toHaveBeenCalled()
      expect(scp.run).not.toHaveBeenCalled()

    it 'should call scp if everything exists', ->
      subject(mockArgs('pull myInstance /path/to/src /path/to/dest'))
      expect(scp.run).toHaveBeenCalledWith({
        _: []
        command: 'pull'
        name: 'myInstance'
        source: '/path/to/src'
        dest: '/path/to/dest'
        direction: 'pull'
      })
