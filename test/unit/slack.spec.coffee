cli = require('../../src/cli')
utils = require('../../src/utils')
slack = require('../../src/commands/slack')

describe 'slack', ->
  beforeEach ->
    spyOn(cli, 'missingArgument')
    spyOn(slack, 'send')

  it 'should fail if name is missing', ->
    cli.execute('slack')
    expect(cli.missingArgument).toHaveBeenCalled()
    expect(slack.send).not.toHaveBeenCalled()

  it 'should handle message alone', ->
    cli.execute('slack "Hello"')
    expect(slack.send.mostRecentCall.args[0]).toEqual({
      channel: '#alerts'
      icon_emoji: ':cloud:'
      icon_url: null
      text: 'Hello'
      username: 'Overcast'
      fields: {}
    })

  it 'should handle options', ->
    cli.execute('slack "My Message" --channel "#general" --icon-emoji ":interrobang:" --user Foo')
    expect(slack.send.mostRecentCall.args[0]).toEqual({
      channel: '#general'
      icon_emoji: ':interrobang:'
      icon_url: null
      text: 'My Message'
      username: 'Foo'
      fields: {}
    })

  it 'should handle custom fields', ->
    cli.execute('slack "Server stats" --cpu "0.54 0.14 0.09" --ram 256mb')
    expect(slack.send.mostRecentCall.args[0]).toEqual({
      channel: '#alerts'
      icon_emoji: ':cloud:'
      icon_url: null
      text: 'Server stats'
      username: 'Overcast'
      fields: {
        cpu: '0.54 0.14 0.09'
        ram: '256mb'
      }
    })
