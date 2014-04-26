run = require('../../modules/commands/run')
ssh = require('../../modules/ssh')
utils = require('../../modules/utils')
mockArgs = require('./utils').mockArgs

describe 'run', ->

  describe 'run', ->
    subject = run.run

    beforeEach ->
      spyOn(utils, 'missingParameter')
      spyOn(ssh, 'run')

    it 'should throw an error if name is missing', ->
      subject(mockArgs('run'))
      expect(utils.missingParameter).toHaveBeenCalled()
      expect(ssh.run).not.toHaveBeenCalled()

    it 'should throw an error if command is missing', ->
      subject(mockArgs('run myInstance'))
      expect(utils.missingParameter).toHaveBeenCalled()
      expect(ssh.run).not.toHaveBeenCalled()

    it 'should call ssh if everything exists', ->
      subject(mockArgs('run myInstance myCommand'))
      expect(ssh.run).toHaveBeenCalledWith({
        _: [ 'myCommand' ]
        command: 'run'
        name: 'myInstance'
      })
