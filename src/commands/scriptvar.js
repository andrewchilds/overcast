import * as ssh from '../ssh.js';

export const commands = {};

commands.scriptvar = {
  name: 'scriptvar',
  usage: ['overcast scriptvar [instance|cluster|all] [filename] [key] [value]'],
  description: [
    'Set a named variable in a remote file on an instance or cluster.',
    'Expects a shell variable format, for example MY_VAR_NAME="my_value"'
  ],
  examples: [
    '$ overcast scriptvar app-01 /path/to/file.sh MY_API_TOKEN abc123'
  ],
  required: [
    { name: 'instance|cluster|all', varName: 'name' },
    { name: 'filename', varName: 'var_filename', raw: true },
    { name: 'key', varName: 'var_name', raw: true },
    { name: 'value', varName: 'var_value', raw: true }
  ],
  options: [
    { usage: '--user USERNAME' },
    { usage: '--password PASSWORD' },
    { usage: '--continueOnError', default: 'false' },
    { usage: '--machine-readable, --mr', default: 'false' },
    { usage: '--parallel, -p', default: 'false' }
  ],
  run: (args) => {
    args._ = ['set_script_var'];
    args.env = {
      VAR_FILENAME: args.var_filename,
      VAR_NAME: args.var_name,
      VAR_VALUE: args.var_value
    };

    ssh.run(args);
  }
};
