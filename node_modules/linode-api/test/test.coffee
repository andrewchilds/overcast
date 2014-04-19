#!/usr/bin/env nodeunit

api_key = process.env['LINODE_API_KEY']

if not api_key?
  console.error 'Please set LINODE_API_KEY in environment.'
  process.exit(1)

exports.test_require = (t) ->
  t.doesNotThrow (-> require '../src/linode-api')
  t.done()

make_client = ->
  LinodeClient = (require '../src/linode-api').LinodeClient
  new LinodeClient api_key

exports.test_echo = (t) ->
  client = make_client()
  msg = 'hello'
  client.call 'test.echo', {msg}, (err, res) ->
    t.ok not err?
    t.ok res?
    t.deepEqual res, {msg}
    t.done()

exports.test_linode_list = (t) ->
  client = make_client()
  client.call 'linode.list', {}, (err, res) ->
    t.ok not err?
    console.log "found #{res.length} linodes"
    t.done()
