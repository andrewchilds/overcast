#!/usr/bin/env coffee
#
# Scrapes the Linode API documentation pages to extract methods
# and associated parameters.

request = require 'request'

api_hrefs = /<a href=["'](\/api\/[^"']+)["']>/g

get_api_groups = ->
  groups = {}
  uri = 'http://www.linode.com/api/'
  console.log "GET #{uri}"
  request {uri}, (_, _, body) ->
    while match = api_hrefs.exec body
      path = match[1]
      name = path.replace /\/api\/(.+)/, '$1'
      uri = "http://linode.com#{path}"
      groups[name] = uri
    for name, uri of groups
      get_methods_for_group name, uri

get_methods_for_group = (name, uri) ->
  methods = {}
  console.log "GET #{uri}"
  request {uri}, (_, _, body) ->
    while match = api_hrefs.exec body
      path = match[1]
      uri  = "http://linode.com#{path}"
      name = decodeURIComponent(path).split('/').pop()
      methods[name] = uri
    for name, uri of methods
      get_parameters_for_method name, uri

api  = {}
reqs = 0

get_parameters_for_method = (name, uri) ->
  props = /<span class="propName">([^<]+)<\/span>.+?\((required|optional)\)/g
  ++reqs
  console.log "GET #{uri}"
  request {uri}, (_, _, body) ->
    reqs--
    body = body.replace /\n/g, ''
    while match = props.exec body
      param    = match[1]
      required = match[2] is 'required'
      api[name] ?= []
      api[name].push {param,required}
    console.log "#{reqs} requests outstanding ..."
    dump_api() if reqs is 0

dump_api = ->
  fs = require 'fs'
  path = __dirname + '/../data/api.json'
  fs.writeFileSync path, JSON.stringify api
  console.log "wrote #{path}"

get_api_groups()
