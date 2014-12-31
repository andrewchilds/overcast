cli = require('../../modules/cli')
scp = require('../../modules/scp')

describe 'pull', ->
  beforeEach ->
    spyOn(cli, 'missingArgument')
    spyOn(scp, 'run')

  it 'should throw an error if name is missing', ->
    cli.execute('pull')
    expect(cli.missingArgument).toHaveBeenCalled()
    expect(scp.run).not.toHaveBeenCalled()

  it 'should throw an error if source is missing', ->
    cli.execute('pull myInstance')
    expect(cli.missingArgument).toHaveBeenCalled()
    expect(scp.run).not.toHaveBeenCalled()

  it 'should throw an error if dest is missing', ->
    cli.execute('pull myInstance /path/to/src')
    expect(cli.missingArgument).toHaveBeenCalled()
    expect(scp.run).not.toHaveBeenCalled()

  it 'should call scp if everything exists', ->
    cli.execute('pull myInstance /path/to/src /path/to/dest')
    expect(scp.run).toHaveBeenCalledWith({
      _: []
      command: 'pull'
      name: 'myInstance'
      source: '/path/to/src'
      dest: '/path/to/dest'
      direction: 'pull'
    })
