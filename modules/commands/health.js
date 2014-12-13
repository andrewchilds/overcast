var _ = require('lodash');
var utils = require('../utils');
var ssh = require('../ssh');

var commands = {};
exports.commands = commands;

commands.health = {
  name: 'health',
  usage: 'overcast health [instance|cluster|all]',
  description: [
    'Outputs common health statistics in JSON format.',
    'Expects an Ubuntu or Debian server.'
  ],
  examples: [
    'Example JSON response:',
    '{',
    '  "my_instance_name": {',
    '    "cpu_1min": 0.53,',
    '    "cpu_5min": 0.05,',
    '    "cpu_15min": 0.10,',
    '    "disk_total": 19592,     // in MB',
    '    "disk_used": 13445,      // in MB',
    '    "disk_free": 5339,       // in MB',
    '    "mem_total": 1000,       // in MB',
    '    "mem_used": 904,         // in MB',
    '    "mem_free": 96,          // in MB',
    '    "cache_used": 589,       // in MB',
    '    "cache_free": 410,       // in MB',
    '    "swap_total": 255,       // in MB',
    '    "swap_used": 124,        // in MB',
    '    "swap_free": 131,        // in MB',
    '    "tcp": 152,              // open TCP connections',
    '    "rx_bytes": 196396703,   // total bytes received',
    '    "tx_bytes": 47183785,    // total bytes transmitted',
    '    "io_reads": 1871210,     // total bytes read',
    '    "io_writes": 6446448,    // total bytes written',
    '    "processes": [',
    '      {',
    '        "user": "root",',
    '        "pid": 1,',
    '        "cpu%": 0,',
    '        "mem%": 0,',
    '        "time": "0:01",',
    '        "command": "/sbin/init"',
    '      }',
    '    ]',
    '  }',
    '}'
  ],
  required: [{ name: 'instance|cluster|all', varName: 'name' }],
  run: function (args) {
    args.continueOnError = true;
    args._ = ['health'];

    var data = {};
    var old = utils.prefixPrint;
    utils.prefixPrint = function (name, color, line) {
      data[name] = data[name] || '';
      data[name] += line;
    };

    ssh.run(args, function () {
      var output = {};
      utils.prefixPrint = old;
      _.each(data, function (raw, name) {
        raw = prepareJSONformat(raw);
        var metrics;
        try {
          metrics = JSON.parse(raw);
          _.each(metrics, function (val, key) {
            if (_.isString(val) && key !== 'disk_space_used_percentage') {
              metrics[key] = parseFloat(val);
            }
          });
          metrics.processes = _.compact(metrics.processes);
          _.each(metrics.processes, function (process, key) {
            process = process.split(' ');
            var obj = {
              user: process.shift(),
              pid: parseInt(process.shift(), 10),
              'cpu%': parseFloat(process.shift()),
              'mem%': parseFloat(process.shift()),
              time: process.shift(),
              command: process.join(' ')
            };
            metrics.processes[key] = obj;
          });
          output[name] = metrics;
        } catch (e) {
          output[name] = {
            error: 'Unable to parse JSON output.'
          };
        }
      });
      console.log(JSON.stringify(output, null, 2));
    });
  }
};

function prepareJSONformat(str) {
  str = str.split('{');
  str.shift();
  str = '{' + str.join('{');
  return sanitize(str);
}

function sanitize(str) {
  return str.replace(/[^\w\s\-\.\,\:\;\'\"\/\[\]\{\}\~\!\@\#\$\%\^\&\(\)\|<\>\/\?]/g, '');
}
