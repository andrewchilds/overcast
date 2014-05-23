_ = require('lodash')
utils = require('../../modules/utils')
virtualbox = require('../../modules/commands/virtualbox')
API = require('../../modules/providers/virtualbox')
specUtils = require('./utils')
mockArgs = specUtils.mockArgs

PROMISE_DELAY = 50

describe 'virtualbox', ->
  mockAPI = specUtils.mock.virtualbox()
  _.each specUtils.endpoints.virtualbox, (endpoint) ->
    API[endpoint] = mockAPI[endpoint]

  beforeEach ->
    spyOn(utils, 'getClusters').andReturn({
        dummy: {
          instances: {
            'dummy.01': {
              name: 'dummy.01'
              ip: '1.2.3.4'
              virtualbox: {
                dir: '/path/to/1.2.3.4'
              }
            }
          }
        }
      })
    spyOn(utils, 'missingParameter')
    spyOn(utils, 'die')
    spyOn(utils, 'grey')
    spyOn(utils, 'dieWithList')
    spyOn(utils, 'success')

  describe 'create', ->
    subject = virtualbox.run

    beforeEach ->
      spyOn(utils, 'saveInstanceToCluster')

    it 'should fail if name is missing', ->
      subject(mockArgs('virtualbox create'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should fail if instance already exists', ->
      subject(mockArgs('virtualbox create dummy.01 --cluster dummy'))
      expect(utils.dieWithList.mostRecentCall.args[0]).toContain('"dummy.01" already exists')

    it 'otherwise should create the instance', ->
      subject(mockArgs('virtualbox create dummy.02'))
      waits PROMISE_DELAY
      runs ->
        saveArgs = utils.saveInstanceToCluster.mostRecentCall.args[1]
        expect(saveArgs.name).toBe 'dummy.02'
        expect(saveArgs.ip).toBe '1.2.3.4'
        expect(saveArgs.user).toBe 'root'
        expect(saveArgs.virtualbox).toEqual {
          dir: '/path/to/1.2.3.4'
          name: 'trusty64.1.2.3.4'
          image: 'trusty64'
          ram: '512'
          cpus: '1'
        }
        expect(utils.success).toHaveBeenCalledWith('New virtualbox instance "dummy.02" (1.2.3.4) created.')

  describe 'destroy', ->
    subject = virtualbox.run

    beforeEach ->
      spyOn(utils, 'deleteInstance')

    it 'should fail if name is missing', ->
      subject(mockArgs('virtualbox destroy'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'otherwise should destroy the instance', ->
      subject(mockArgs('virtualbox destroy dummy.01 --force'))
      waits PROMISE_DELAY
      runs ->
        expect(utils.deleteInstance.mostRecentCall.args[0].name).toBe('dummy.01')
        expect(utils.success).toHaveBeenCalledWith('Instance "dummy.01" destroyed.')

  describe 'reboot', ->
    subject = virtualbox.run

    it 'should fail if name is missing', ->
      subject(mockArgs('virtualbox reboot'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'otherwise should reboot the instance', ->
      subject(mockArgs('virtualbox reboot dummy.01'))
      waits PROMISE_DELAY
      runs ->
        expect(utils.success).toHaveBeenCalledWith('Instance dummy.01 rebooted.')

  describe 'start', ->
    subject = virtualbox.run

    it 'should fail if name is missing', ->
      subject(mockArgs('virtualbox start'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'otherwise should start the instance', ->
      subject(mockArgs('virtualbox start dummy.01'))
      waits PROMISE_DELAY
      runs ->
        expect(utils.success).toHaveBeenCalledWith('Instance dummy.01 started.')

  describe 'stop', ->
    subject = virtualbox.run

    it 'should fail if name is missing', ->
      subject(mockArgs('virtualbox stop'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'otherwise should stop the instance', ->
      subject(mockArgs('virtualbox stop dummy.01'))
      waits PROMISE_DELAY
      runs ->
        expect(utils.success).toHaveBeenCalledWith('Instance dummy.01 stopped.')
