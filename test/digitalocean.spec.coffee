specUtils = require('./utils')
overcast = specUtils.overcast

utils = require('../modules/utils')
digitalocean = require('../modules/providers/digitalocean')

utils.setConfigDir(__dirname + '/.overcast')

describe 'digitalocean.create', ->
  subject = digitalocean.create
  options = {}

  beforeEach ->
    options =
      name: 'name'
      cluster: 'test-cluster'
    spyOn(digitalocean, 'getOrCreateOvercastKeyID').andCallFake (cb) -> cb '123'
    spyOn(digitalocean, 'request')
    spyOn(utils, 'saveClusters')

  it 'should use defaults if no options specified', ->
    subject(options)
    expect(digitalocean.request).toHaveBeenCalledWith
      endpoint: 'droplets/new'
      query: {
        name: 'name'
        ssh_key_ids: '123'
        size_slug: '512mb'
        image_slug: 'ubuntu-12-04-x64'
        region_slug: 'nyc2'
      }
      callback: jasmine.any(Function)

  it 'should handle id-based options', ->
    options['size-id'] = '1'
    options['image-id'] = '2'
    options['region-id'] = '3'
    subject(options)
    expect(digitalocean.request.mostRecentCall.args[0].query).toEqual
      name: 'name'
      ssh_key_ids: '123'
      size_id: '1'
      image_id: '2'
      region_id: '3'

  it 'should handle --image-name', ->
    spyOn(digitalocean, 'getImages').andCallFake (cb) ->
      cb [ { name: 'my.image.name', id: 12345 } ]
    options['image-name'] = 'my.image.name'
    subject(options)
    expect(digitalocean.request.mostRecentCall.args[0].query).toEqual
      name: 'name'
      ssh_key_ids: '123'
      image_id: 12345
      size_slug: '512mb'
      region_slug: 'nyc2'
