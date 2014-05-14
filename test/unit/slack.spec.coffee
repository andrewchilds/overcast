utils = require('../../modules/utils')
slack = require('../../modules/commands/slack')
specUtils = require('./utils')
mockArgs = specUtils.mockArgs

describe 'slack', ->
  subject = slack.run

  beforeEach ->
    spyOn(utils, 'missingParameter')
    spyOn(utils, 'dieWithList')
    spyOn(slack, 'send')

  it 'should fail if name is missing', ->
    subject(mockArgs('slack'))
    expect(utils.missingParameter).toHaveBeenCalled()

  it 'should handle message alone', ->
    subject(mockArgs('slack "Hello"'))
    expect(slack.send.mostRecentCall.args[0]).toEqual({
      channel: '#alerts'
      icon_emoji: ':cloud:'
      icon_url: null
      text: 'Hello'
      username: 'Overcast'
      fields: {}
    })

  it 'should handle options', ->
    subject(mockArgs('slack "My Message" --channel "#general" --icon-emoji ":interrobang:" --user Foo'))
    expect(slack.send.mostRecentCall.args[0]).toEqual({
      channel: '#general'
      icon_emoji: ':interrobang:'
      icon_url: null
      text: 'My Message'
      username: 'Foo'
      fields: {}
    })

  it 'should handle custom fields', ->
    subject(mockArgs('slack "Server stats" --cpu "0.54 0.14 0.09" --ram 256mb'))
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
