#!/usr/bin/env coffee

client = new (require '../src/linode-api').LinodeClient process.env['LINODE_API_KEY']
LinodeID = process.env['LINODE_ID']

client.call 'linode.ip.addprivate', {LinodeID}, (err, res) ->
  throw err if err?
  client.call 'linode.ip.list', {LinodeID}, (err, res) ->
    throw err if err?
    private_ip = (x.IPADDRESS for x in res when x.ISPUBLIC is 0).pop()
    console.log "PRIVATE_IP=#{private_ip}"
