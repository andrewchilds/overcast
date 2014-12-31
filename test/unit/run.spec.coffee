ssh = require('../../modules/ssh')
cli = require('../../modules/cli')

describe 'run', ->
  beforeEach ->
    spyOn(cli, 'missingArgument')
    spyOn(ssh, 'run')

  it 'should throw an error if name is missing', ->
    cli.execute('run')
    expect(cli.missingArgument).toHaveBeenCalled()
    expect(ssh.run).not.toHaveBeenCalled()

  it 'should throw an error if command is missing', ->
    cli.execute('run myInstance')
    expect(cli.missingArgument).toHaveBeenCalled()
    expect(ssh.run).not.toHaveBeenCalled()

  it 'should call ssh if everything exists', ->
    cli.execute('run myInstance /path/to/script uptime')
    expect(ssh.run).toHaveBeenCalledWith({
      _: [ '/path/to/script', 'uptime' ]
      command: 'run'
      name: 'myInstance'
    })
