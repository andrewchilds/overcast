import _ from 'lodash';
import utils from '../utils';
import ssh from '../ssh';

const commands = {};
export {commands};

commands.exposed = {
  name: 'exposed',
  usage: 'overcast exposed [instance|cluster|all]',
  description: [
    'List the exposed ports on the instance or cluster.',
    'Expects an Ubuntu server, untested on other distributions.'
  ],
  options: [
    { usage: '--user USERNAME' },
    { usage: '--password PASSWORD' },
    { usage: '--machine-readable, --mr' }
  ],
  required: [{ name: 'instance|cluster|all', varName: 'name' }],
  run: function (args) {
    args._ = ['list_exposed_ports'];
    ssh.run(args);
  }
};
