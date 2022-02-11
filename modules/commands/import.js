import instance from './instance';

const commands = {};
export {commands};

commands.import = {
  name: 'import',
  usage: 'overcast import [name] [ip] [options...]',
  description: instance.commands.import.description,
  required: instance.commands.import.required,
  options: instance.commands.import.options,
  run: function (args) {
    args.command = 'instance';
    args._.unshift('import');
    instance.commands.import.run(args);
  }
};
