push = require('../../modules/commands/push')
scp = require('../../modules/scp')
utils = require('../../modules/utils')

describe 'push', ->
  subject = push.run

  beforeEach ->
    spyOn(utils, 'missingParameter')
    spyOn(scp, 'run')

  it 'should throw an error if name is missing', ->
    subject({ '_': [] })
    expect(utils.missingParameter).toHaveBeenCalled()
    expect(scp.run).not.toHaveBeenCalled()

  it 'should throw an error if source is missing', ->
    subject({ '_': [ 'myInstance' ] })
    expect(utils.missingParameter).toHaveBeenCalled()
    expect(scp.run).not.toHaveBeenCalled()

  it 'should throw an error if dest is missing', ->
    subject({ '_': [ 'myInstance', '/path/to/source' ] })
    expect(utils.missingParameter).toHaveBeenCalled()
    expect(scp.run).not.toHaveBeenCalled()

  it 'should call scp if everything exists', ->
    subject({ '_': [ 'myInstance', '/path/to/source', '/path/to/dest' ] })
    expect(scp.run).toHaveBeenCalledWith({
      _: [],
      name: 'myInstance',
      source: '/path/to/source',
      dest: '/path/to/dest',
      direction: 'push'
    })
