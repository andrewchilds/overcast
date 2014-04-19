#!/usr/bin/env node
(function() {
  var LinodeClient, action, api_key, argv, client, dump_api, k, opts, params, util, v, x, _i, _len, _ref, _ref2, _ref3;
  _ref = require('linode-api'), LinodeClient = _ref.LinodeClient, dump_api = _ref.dump_api;
  util = require('util');
  opts = (require('optimist')).usage('Usage: linode-client [-k <api key>] <action> [param=value ...]').string('k');
  argv = opts.argv;
  action = argv._.shift();
  api_key = argv.k || process.env['LINODE_API_KEY'] || '';
  if (api_key.length === 0 && action !== 'user.getapikey') {
    console.error('no api key\n');
    opts.showHelp();
    process.exit(1);
  }
  if (action == null) {
    console.error('nothing to do\n');
    opts.showHelp();
    console.error("<action> is one of the following:\n");
    console.error(dump_api());
    process.exit(1);
  }
  params = {};
  _ref2 = argv._;
  for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
    x = _ref2[_i];
    _ref3 = x.split('='), k = _ref3[0], v = _ref3[1];
    params[k] = v;
  }
  client = new LinodeClient(api_key);
  client.call(action, params, function(err, res) {
    if (err != null) {
      console.error(err.toString());
      process.exit(1);
    }
    return console.log(util.inspect(res));
  });
}).call(this);
