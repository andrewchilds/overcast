run = require('../../modules/commands/run')
ssh = require('../../modules/ssh')
utils = require('../../modules/utils')

describe 'run', ->
  subject = run.run

  beforeEach ->
    spyOn(utils, 'missingParameter')
    spyOn(ssh, 'run')

  it 'should throw an error if name is missing', ->
    subject({ '_': [] })
    expect(utils.missingParameter).toHaveBeenCalled()
    expect(ssh.run).not.toHaveBeenCalled()

  it 'should throw an error if command is missing', ->
    subject({ '_': [ 'myInstance' ] })
    expect(utils.missingParameter).toHaveBeenCalled()
    expect(ssh.run).not.toHaveBeenCalled()

  it 'should call ssh if everything exists', ->
    subject({ '_': [ 'myInstance', 'command' ] })
    expect(ssh.run).toHaveBeenCalledWith({
      _: [ 'command' ],
      name: 'myInstance'
    })
