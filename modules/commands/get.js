import instance from './instance';

const commands = {};
export {commands};

commands.get = {
  name: 'get',
  usage: 'overcast get [instance|cluster|all] [attr...] [options...]',
  description: instance.commands.get.description,
  required: instance.commands.get.required,
  options: instance.commands.get.options,
  run: function (args) {
    args.command = 'instance';
    args.subcommand = 'get';
    instance.commands.get.run(args);
  }
};
