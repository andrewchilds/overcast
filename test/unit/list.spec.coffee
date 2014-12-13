cli = require('../../modules/cli')
utils = require('../../modules/utils')

describe 'list', ->
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

  it 'should return a list of bash aliases', ->
    cli.execute('list')
    expect(console.log.mostRecentCall.args[0]).toBe '  vm01 (root@1.2.3.4:22)'
