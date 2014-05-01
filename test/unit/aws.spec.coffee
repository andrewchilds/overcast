fs = require('fs')
path = require('path')
_ = require('lodash')
utils = require('../../modules/utils')
aws = require('../../modules/commands/aws')
API = require('../../modules/providers/aws')
specUtils = require('./utils')
mockArgs = specUtils.mockArgs

describe 'aws', ->
  mockEC2 = specUtils.mock.ec2()
  pubKeyPath = path.normalize(__dirname + '/../fixtures/overcast.key.pub')
  API.pollDelay = 0
  API.ec2 = mockEC2

  beforeEach ->
    spyOn(utils, 'getClusters').andReturn({
        dummy: {
          instances: {
            'dummy.01': {
              name: 'dummy.01'
              aws: {
                id: 'InstanceId'
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
    spyOn(utils, 'waitForBoot')

  describe 'create', ->
    subject = aws.run

    beforeEach ->
      spyOn(utils, 'saveInstanceToCluster')

    it 'should fail if name is missing', ->
      subject(mockArgs('aws create'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should fail if cluster is missing', ->
      subject(mockArgs('aws create dummy.02'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'should fail if cluster does not exist', ->
      subject(mockArgs('aws create dummy.02 --cluster missing'))
      expect(utils.die.mostRecentCall.args[0]).toContain('No "missing" cluster found')

    it 'should fail if instance already exists', ->
      subject(mockArgs('aws create dummy.01 --cluster dummy'))
      expect(utils.dieWithList.mostRecentCall.args[0]).toContain('"dummy.01" already exists')

    it 'otherwise should create the instance', ->
      subject(mockArgs('aws create dummy.02 --cluster dummy --user ubuntu --ssh-key /path/to/id_rsa --ssh-pub-key ' + pubKeyPath))
      waits 20
      runs ->
        runParams = specUtils.spies.ec2.runInstances.mostRecentCall.args[0]
        saveParams = utils.saveInstanceToCluster.mostRecentCall.args[1]

        expect(runParams.ImageId).toBe 'ami-018c9568'
        expect(runParams.InstanceType).toBe 't1.micro'

        expect(saveParams.name).toBe 'dummy.02'
        expect(saveParams.ip).toBe '1.1.1.1'
        expect(saveParams.ssh_key).toBe '/path/to/id_rsa'
        expect(saveParams.user).toBe 'ubuntu'
        expect(saveParams.aws.id).toBe 'InstanceId'

        expect(utils.success).toHaveBeenCalledWith('New instance "dummy.02" (1.1.1.1) created on EC2.')

  describe 'destroy', ->
    subject = aws.run

    beforeEach ->
      spyOn(utils, 'saveInstanceToCluster')
      spyOn(utils, 'deleteInstance')

    it 'should fail if name is missing', ->
      subject(mockArgs('aws destroy'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'otherwise should destroy the instance', ->
      subject(mockArgs('aws destroy dummy.01 --force'))
      waits 20
      runs ->
        expect(specUtils.spies.ec2.terminateInstances.mostRecentCall.args[0]).toEqual({
          InstanceIds: [ 'InstanceId' ]
        })
        expect(utils.deleteInstance.mostRecentCall.args[0].name).toBe('dummy.01')
        expect(utils.success).toHaveBeenCalledWith('Instance destroyed.')

  describe 'reboot', ->
    subject = aws.run

    it 'should fail if name is missing', ->
      subject(mockArgs('aws reboot'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'otherwise should reboot the instance', ->
      subject(mockArgs('aws reboot dummy.01'))
      waits 20
      runs ->
        expect(specUtils.spies.ec2.rebootInstances.mostRecentCall.args[0]).toEqual({
          InstanceIds: [ 'InstanceId' ]
        })
        expect(utils.success).toHaveBeenCalledWith('Instance rebooted.')

  describe 'start', ->
    subject = aws.run

    it 'should fail if name is missing', ->
      subject(mockArgs('aws start'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'otherwise should start the instance', ->
      subject(mockArgs('aws start dummy.01'))
      waits 20
      runs ->
        expect(specUtils.spies.ec2.startInstances.mostRecentCall.args[0]).toEqual({
          InstanceIds: [ 'InstanceId' ]
        })
        expect(utils.success).toHaveBeenCalledWith('Instance started.')

  describe 'stop', ->
    subject = aws.run
    state = specUtils.mockData.ec2.describeInstances.Reservations[0].Instances[0].State
    originalState = state.Name

    beforeEach ->
      state.Name = 'stopped'

    afterEach ->
      state.Name = originalState

    it 'should fail if name is missing', ->
      subject(mockArgs('aws stop'))
      expect(utils.missingParameter).toHaveBeenCalled()

    it 'otherwise should stop the instance', ->
      subject(mockArgs('aws stop dummy.01'))
      waits 20
      runs ->
        expect(specUtils.spies.ec2.stopInstances.mostRecentCall.args[0]).toEqual({
          InstanceIds: [ 'InstanceId' ]
        })
        expect(utils.success).toHaveBeenCalledWith('Instance stopped.')
