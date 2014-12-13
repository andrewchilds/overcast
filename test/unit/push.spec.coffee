push = require('../../modules/commands/push')
cli = require('../../modules/cli')
scp = require('../../modules/scp')
utils = require('../../modules/utils')
mockArgs = require('./utils').mockArgs

describe 'push', ->
  beforeEach ->
    spyOn(cli, 'missingArgument')
    spyOn(scp, 'run')

  it 'should throw an error if name is missing', ->
    cli.execute('push')
    expect(cli.missingArgument).toHaveBeenCalled()
    expect(scp.run).not.toHaveBeenCalled()

  it 'should throw an error if source is missing', ->
    cli.execute('push myInstance')
    expect(cli.missingArgument).toHaveBeenCalled()
    expect(scp.run).not.toHaveBeenCalled()

  it 'should throw an error if dest is missing', ->
    cli.execute('push myInstance /path/to/src')
    expect(cli.missingArgument).toHaveBeenCalled()
    expect(scp.run).not.toHaveBeenCalled()

  it 'should call scp if everything exists', ->
    cli.execute('push myInstance /path/to/src /path/to/dest')
    expect(scp.run).toHaveBeenCalledWith({
      _: []
      command: 'push'
      name: 'myInstance'
      source: '/path/to/src'
      dest: '/path/to/dest'
      direction: 'push'
    })
