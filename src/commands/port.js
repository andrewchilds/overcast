import _ from 'lodash';
import * as utils from '../utils.js';
import * as ssh from '../ssh.js';
import * as filters from '../filters.js';

export const commands = {};

commands.port = {
  name: 'port',
  usage: 'overcast port [instance|cluster|all] [port]',
  description: [
    'Change the SSH port for an instance or a cluster. This command fails',
    'if the new port has not been previously opened by iptables.',
    'See also the "expose" and "exposed" commands.'
  ],
  examples: [
    '# Expose only necessary ports:',
    '$ overcast expose vm-01 22 55522 80 443',
    '',
    '# Update SSH port from 22 to 55522:',
    '$ overcast port vm-01 55522',
    '',
    '# Close port 22:',
    '$ overcast expose vm-01 55522 80 443'
  ],
  required: [
    { name: 'instance|cluster|all', varName: 'name', filters: filters.findMatchingInstances },
    { name: 'port' }
  ],
  run: function (args) {
    const new_ssh_port = `${args.port}`;
    args.env = {
      new_ssh_port
    };

    args._ = ['change_ssh_port'];
    ssh.run(args, () => {
      utils.each(args.instances, ({name}) => {
        utils.updateInstance(name, {
          ssh_port: new_ssh_port
        });
      });
    });
  }
};
