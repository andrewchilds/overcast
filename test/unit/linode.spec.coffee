utils = require('../../modules/utils')
API = require('../../modules/providers/linode')
linode = require('../../modules/commands/linode')
mockArgs = require('./utils').mockArgs
mockPromise = require('./utils').mockPromise

describe 'linode', ->

  describe 'run', ->
    subject = linode.run

    beforeEach ->
      spyOn(utils, 'missingCommand')
      spyOn(utils, 'missingParameter')

    it 'should call missingCommand if command is missing', ->
      subject(mockArgs('linode'))
      expect(utils.missingCommand).toHaveBeenCalled()

    it 'should call missingCommand if command is missing', ->
      subject(mockArgs('linode foo'))
      expect(utils.missingCommand).toHaveBeenCalled()

    it 'should call missingParameter if name is missing during boot', ->
      subject(mockArgs('linode boot'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should call missingParameter if name is missing during destroy', ->
      subject(mockArgs('linode destroy'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should call missingParameter if name is missing during reboot', ->
      subject(mockArgs('linode reboot'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should call missingParameter if name is missing during resize', ->
      subject(mockArgs('linode resize'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should call missingParameter if name is missing during shutdown', ->
      subject(mockArgs('linode shutdown'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should call missingParameter if name is missing during create', ->
      subject(mockArgs('linode create'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should call missingParameter if --cluster is missing during create', ->
      subject(mockArgs('linode create myInstance'))
      expect(utils.missingParameter).toHaveBeenCalled()
