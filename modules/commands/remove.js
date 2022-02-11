import utils from '../utils';
import instance from './instance';

const commands = {};
export {commands};

commands.remove = {
  name: 'remove',
  usage: 'overcast remove [name]',
  description: instance.commands.remove.description,
  examples: instance.commands.remove.examples,
  required: instance.commands.remove.required,
  run: function (args) {
    args.command = 'instance';
    args._.unshift('remove');
    instance.commands.remove.run(args);
  }
};
