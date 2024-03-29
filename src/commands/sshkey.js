import fs from 'fs';
import * as utils from '../utils.js';
import * as filters from '../filters.js';
import * as ssh from '../ssh.js';
import * as log from '../log.js';
import { getConfigDir } from '../store.js';

export const commands = {};

commands.create = {
  name: 'create',
  usage: ['overcast sshkey create [name]'],
  description: 'Creates a new SSH key in the current .overcast config.',
  examples: [
    '$ overcast sshkey create myKeyName',
    'New SSH key "myKeyName" created.',
    ' - /path/to/.overcast/keys/myKeyName.key',
    ' - /path/to/.overcast/keys/myKeyName.key.pub'
  ],
  required: [{ name: 'name', filters: filters.shouldBeNewKey }],
  run: ({ name }, nextFn) => {
    utils.createKey(name, nextFn);
  }
};

commands.delete = {
  name: 'delete',
  usage: ['overcast sshkey delete [name]'],
  description: 'Deletes SSH public/private key files from the current .overcast config.',
  examples: [
    '$ overcast sshkey delete myKeyName',
    'SSH key "myKeyName" deleted.'
  ],
  required: [{ name: 'name', filters: filters.shouldBeExistingKey }],
  run: ({ name }, nextFn) => {
    utils.deleteKey(name, () => {
      log.success(`SSH key "${name}" deleted.`);
      nextFn();
    });
  }
};

commands.get = {
  name: 'get',
  usage: ['overcast sshkey get [name] [option]'],
  description: [
    'Display the requested SSH key data or path from the current .overcast config.',
    'Defaults to displaying the public key data if no option found.'
  ],
  options: [
    { usage: '--public-data' },
    { usage: '--private-data' },
    { usage: '--public-path' },
    { usage: '--private-path' }
  ],
  examples: [
    '$ overcast sshkey get myKeyName',
    '[public key data]',
    '$ overcast sshkey get myKeyName --private-data',
    '[private key data]'
  ],
  required: [{ name: 'name', filters: filters.shouldBeExistingKey }],
  run: (args, nextFn) => {
    const keyFile = utils.getKeyFileFromName(args.name);
    const publicKeyFile = `${keyFile}.pub`;

    if (args['private-data']) {
      printFile(keyFile);
    } else if (args['private-path']) {
      log.log(keyFile);
    } else if (args['public-path']) {
      log.log(publicKeyFile);
    } else {
      printFile(publicKeyFile);
    }

    nextFn();
  }
};

commands.list = {
  name: 'list',
  usage: ['overcast sshkey list'],
  description: 'List the found SSH key names in the current .overcast config.',
  examples: [
    '$ overcast sshkey list',
    'myKeyName',
    'overcast'
  ],
  run: (args, nextFn) => {
    listKeys(nextFn);
  }
};

commands.push = {
  name: 'push',
  usage: ['overcast sshkey push [instance|cluster|all] [name|path] [options...]'],
  description: [
    'Push a public SSH key to an instance or cluster. Accepts a key name,',
    'filename, or full path. This will overwrite the existing authorized_keys',
    'file, unless you use --append.'
  ],
  examples: [
    '# Generate new SSH key pair:',
    '$ overcast sshkey create newKey',
    '',
    '# Push public key to instance, update instance config to use private key:',
    '$ overcast sshkey push vm-01 newKey',
    '$ overcast instance update vm-01 --ssh-key newKey.key',
    '',
    '# Same as above but using key path instead of key name:',
    '$ overcast sshkey push vm-02 "~/.ssh/id_rsa.pub"',
    '$ overcast instance update vm-02 --ssh-key "~/.ssh/id_rsa"',
    '',
    '# Push public key to instance using arbitrary user:',
    '$ overcast sshkey push vm-03 newKey --user myOtherUser',
    '',
    '# Append public key to authorized_keys instead of overwriting:',
    '$ overcast sshkey push vm-04 newKey --append'
  ],
  required: [
    { name: 'instance|cluster|all', varName: 'name', filters: filters.findMatchingInstances },
    { name: 'name|path', varName: 'path', raw: true }
  ],
  options: [
    { usage: '--user USERNAME' },
    { usage: '--append, -a', default: 'false' }
  ],
  run: (args, nextFn) => {
    const keyPath = getKeyPath(args.path);
    args.env = {
      PUBLIC_KEY: fs.readFileSync(keyPath, { encoding: 'utf8' }),
      SHOULD_APPEND: utils.argIsTruthy(args.append) || utils.argIsTruthy(args.a)
    };

    args._ = ['authorize_key'];
    args.mr = true; // machine readable
    ssh.run(args, () => {
      log.success(`Key updated on ${args.instances.length} instance(s).`);
      log.info('If this is the default user you use to SSH in,');
      log.info('you need to update the instance configuration. For example:');
      log.info(`overcast instance update ${args.name} --ssh-key myPrivateKey.key`);

      nextFn();
    });
  }
};

export function getKeyPath(path) {
  let keyPath = utils.normalizeKeyPath(path);
  if (!fs.existsSync(keyPath)) {
    if (fs.existsSync(`${keyPath}.key.pub`)) {
      keyPath += '.key.pub';
    } else if (fs.existsSync(`${keyPath}.pub`)) {
      keyPath += '.pub';
    } else {
      return utils.die(`Key "${keyPath}" not found.`);
    }
  }

  return keyPath;
}

function printFile(file) {
  const data = fs.readFileSync(file, { encoding: 'utf8' });
  log.log(data.toString());
}

function listKeys(nextFn) {
  fs.readdir(`${getConfigDir()}/keys/`, (err, data) => {
    const obj = {};
    data.forEach((name) => {
      name = name.replace('.pub', '').replace('.key', '');
      obj[name] = true;
    });
    Object.keys(obj).forEach(row => {
      log.log(row);
    });

    nextFn();
  });
}
