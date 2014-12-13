cli = require('../../modules/cli')
utils = require('../../modules/utils')

describe 'completions', ->
  beforeEach ->
    spyOn(utils, 'getClusters').andReturn({
        default: {
          instances: {
            vm01: {
              name: 'vm01',
              ip: '1.2.3.4',
              ssh_key: 'overcast.key',
              ssh_port: '22',
              user: 'root'
            }
          }
        }
      })
    spyOn(console, 'log')

  it 'should return a list of commands, clusters and instances', ->
    cli.execute('completions')
    stdout = console.log.mostRecentCall.args[0]
    expect(stdout).toContain 'overcast'
    expect(stdout).toContain 'aliases'
    expect(stdout).toContain 'default'
    expect(stdout).toContain 'vm01'
