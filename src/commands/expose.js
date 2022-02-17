import * as utils from '../utils.js';
import * as ssh from '../ssh.js';

export const commands = {};

commands.expose = {
  name: 'expose',
  usage: ['overcast expose [instance|cluster|all] [port...] [options]'],
  description: [
    'Reset the exposed ports on the instance or cluster using iptables.',
    'This will fail if you don\'t include the current SSH port.',
    'Specifying --allowlist will restrict all ports to the specified address(es).',
    'These can be individual IPs or CIDR ranges, such as "192.168.0.0/24".',
    '',
    'Expects an Ubuntu server, untested on other distributions.'
  ],
  required: [
    { name: 'instance|cluster|all', varName: 'name' },
    { name: 'port...', varName: 'ports', greedy: true }
  ],
  options: [
    { usage: '--user USERNAME' },
    { usage: '--password PASSWORD' },
    { usage: '--allowlist "IP|RANGE"' },
    { usage: '--allowlist-PORT "IP|RANGE"' }
  ],
  examples: [
    'Allow SSH, HTTP and HTTPS connections from anywhere:',
    '$ overcast expose app 22 80 443',
    '',
    'Allow SSH from anywhere, only allow Redis connections from 1.2.3.4:',
    '$ overcast expose redis 22 6379 --allowlist-6379 "1.2.3.4"',
    '',
    'Only allow SSH and MySQL connections from 1.2.3.4 or from 5.6.7.xxx:',
    '$ overcast expose mysql 22 3306 --allowlist "1.2.3.4 5.6.7.0/24"'
  ],
  run: (args, nextFn) => {
    args.env = {
      exposed_ports: args.ports
    };
    args._ = ['install/iptables'];
    utils.eachObject(args, (val, key) => {
      if (key.indexOf('allowlist') === 0) {
        args.env[key.replace('-', '_')] = val;
      }
    });
    ssh.run(args, nextFn);
  }
};
