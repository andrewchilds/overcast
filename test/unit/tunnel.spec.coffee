_ = require('lodash')
cli = require('../../src/cli')
utils = require('../../src/utils')
tunnel = require('../../src/commands/tunnel')
specUtils = require('./utils')

describe 'tunnel', ->
  beforeEach ->
    spyOn(utils, 'getClusters').andReturn({
        dummy: {
          instances: {
            'dummy.01': {
              name: 'dummy.01'
              ip: '1.1.1.1'
              user: 'root'
              ssh_key: 'overcast.key'
              ssh_port: '22'
            }
          }
        }
      })
    spyOn(cli, 'missingArgument')
    spyOn(utils, 'die')
    spyOn(utils, 'grey')
    spyOn(utils, 'cyan')
    spyOn(utils, 'dieWithList')
    spyOn(utils, 'spawn').andReturn specUtils.mock.emitter()

  it 'should fail if name is missing', ->
    cli.execute('tunnel')
    expect(cli.missingArgument).toHaveBeenCalled()

  it 'should fail if port is missing', ->
    cli.execute('tunnel dummy.01')
    expect(cli.missingArgument).toHaveBeenCalled()

  it 'should handle [port]', ->
    cli.execute('tunnel dummy.01 1234')
    expect(utils.spawn.mostRecentCall.args[0]).toContain('-L 1234:127.0.0.1:1234')
    expect(utils.cyan).toHaveBeenCalledWith('Tunneling from 1234 to 127.0.0.1:1234.')

  it 'should handle [local-port:remote-port]', ->
    cli.execute('tunnel dummy.01 3000:4000')
    expect(utils.spawn.mostRecentCall.args[0]).toContain('-L 3000:127.0.0.1:4000')
    expect(utils.cyan).toHaveBeenCalledWith('Tunneling from 3000 to 127.0.0.1:4000.')

  it 'should handle [local-port:remote-host:remote-port]', ->
    cli.execute('tunnel dummy.01 3000:otherhost:4000')
    expect(utils.spawn.mostRecentCall.args[0]).toContain('-L 3000:otherhost:4000')
    expect(utils.cyan).toHaveBeenCalledWith('Tunneling from 3000 to otherhost:4000.')

  it 'should handle multiple tunnels', ->
    cli.execute('tunnel dummy.01 3000 4000:5000 6000:otherhost:7000')
    args = utils.spawn.mostRecentCall.args[0]
    expect(args).toContain('-L 3000:127.0.0.1:3000')
    expect(args).toContain('-L 4000:127.0.0.1:5000')
    expect(args).toContain('-L 6000:otherhost:7000')
    expect(utils.cyan).toHaveBeenCalledWith('Tunneling from 3000 to 127.0.0.1:3000.')
    expect(utils.cyan).toHaveBeenCalledWith('Tunneling from 4000 to 127.0.0.1:5000.')
    expect(utils.cyan).toHaveBeenCalledWith('Tunneling from 6000 to otherhost:7000.')
