cli = require('../../modules/cli')
utils = require('../../modules/utils')

describe 'aliases', ->
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
    spyOn(utils, 'normalizeKeyPath').andCallFake (key) ->
      '/path/to/' + key
    spyOn(console, 'log')

  it 'should return a list of bash aliases', ->
    expected = 'alias ssh.vm01="ssh -i /path/to/overcast.key -p 22 root@1.2.3.4"'
    cli.execute('aliases')
    expect(console.log.mostRecentCall.args[0]).toBe expected
