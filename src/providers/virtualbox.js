import fs from 'fs';
import cp from 'child_process';
import * as utils from '../utils.js';
import * as log from '../log.js';

var FIRST_IP = '192.168.22.10';
var OVERCAST_VAGRANT_DIR = utils.getUserHome() + '/.overcast-vagrant';

// export var id = 'virtualbox';
// export var name = 'VirtualBox';

var BUNDLED_IMAGE_URLS = {
  'trusty64': 'https://cloud-images.ubuntu.com/vagrant/trusty/current/trusty-server-cloudimg-amd64-vagrant-disk1.box',
  'precise64': 'https://cloud-images.ubuntu.com/vagrant/precise/current/precise-server-cloudimg-amd64-vagrant-disk1.box'
};

// Provider interface

export function boot(instance, callback) {
  startInstance(instance)
    .catch(genericCatch)
    .then(() => {
      if (utils.isFunction(callback)) {
        callback();
      }
    });
}

export function create(args, callback) {
  args = Object.assign({
    ssh_port: 22,
    user: 'root',
    ssh_key: utils.normalizeKeyPath(args['ssh-key'] || 'overcast.key'),
    ssh_pub_key: utils.normalizeKeyPath(args['ssh-pub-key'] || 'overcast.key.pub'),
    image: args.image || 'trusty64',
    ram: args.ram || '512',
    cpus: args.cpus || '1'
  }, args);

  getVagrantImages(args)
    .then(createVagrantBox)
    .then(createInstance)
    .catch(genericCatch)
    .then(args => {
      var instance = {
        name: args.name,
        ip: args.ip,
        ssh_key: args.ssh_key,
        ssh_port: '22',
        user: 'root',
        virtualbox: {
          dir: args.dir,
          name: args.image + '.' + args.ip,
          image: args.image,
          ram: args.ram,
          cpus: args.cpus
        }
      };

      if (utils.isFunction(callback)) {
        callback(instance);
      }
    });
}

export function destroy(instance, callback) {
  destroyInstance(instance)
    .catch(genericCatch)
    .then(() => {
      if (utils.isFunction(callback)) {
        callback();
      }
    });
}

export function reboot(instance, callback) {
  stopInstance(instance)
    .then(startInstance)
    .catch(genericCatch)
    .then(instance => {
      if (utils.isFunction(callback)) {
        callback();
      }
    });
}

export function shutdown(instance, callback) {
  stopInstance(instance)
    .catch(genericCatch)
    .then(() => {
      if (utils.isFunction(callback)) {
        callback();
      }
    });
}

// Internal functions

export function parseCSV(str) {
  var arr = [];
  (str || '').split("\n").forEach((row) => {
    row = row.trim();
    if (row) {
      // TODO: This doesn't handle double quotes or escaped commas. Fix me.
      arr.push(row.split(','));
    }
  });
  return arr;
}

export function getVagrantImages(args) {
  return new Promise((resolve, reject) => {
    const vagrant = utils.spawn(['vagrant box list --machine-readable']);
    let stdout = '';

    vagrant.stdout.on('data', data => {
      stdout += data + '';
    });

    vagrant.on('exit', code => {
      if (code !== 0) {
        reject();
      } else {
        const images = [];
        parseCSV(stdout).forEach((row) => {
          if (row[2] === 'box-name') {
            images.push(row[3]);
          }
        });
        args.vagrantImages = images;
        resolve(args);
      }
    });
  });
}

export function createVagrantBox(args) {
  return new Promise((resolve, reject) => {
    if (args.vagrantImages && args.vagrantImages.indexOf(args.image) !== -1) {
      log.faded('Image "' + args.image + '" found.');
      resolve(args);
    } else if (BUNDLED_IMAGE_URLS[args.image]) {
      var color = utils.getNextColor();
      var vagrant = utils.spawn(['vagrant box add --name ' + args.image + ' ' + BUNDLED_IMAGE_URLS[args.image]]);

      vagrant.stdout.on('data', data => {
        utils.prefixPrint(args.name, color, data);
      });

      vagrant.stderr.on('data', data => {
        utils.prefixPrint(args.name, color, data, 'grey');
      });

      vagrant.on('exit', code => {
        if (code !== 0) {
          reject();
        } else {
          resolve(args);
        }
      });
    } else {
      log.failure('Image "' + args.image + '" not found. Please add this using Vagrant:');
      return utils.die('vagrant box add --name "' + args.image + '" [image-url]');
    }
  });
}

export function nextAvailableIP(ip) {
  if (fs.existsSync(OVERCAST_VAGRANT_DIR + '/' + ip)) {
    var existing = fs.readdirSync(OVERCAST_VAGRANT_DIR);
    return findNextAvailableIP(existing);
  } else {
    return ip;
  }
}

export function findNextAvailableIP(existing) {
  var ip = FIRST_IP;

  while (existing.indexOf(ip) !== -1) {
    ip = ip.split('.');
    if (ip[3] === '255') {
      if (ip[2] === '255') {
        log.failure('Congratulations! You seem to have used all available IP addresses in the 192.168 block.');
        return utils.die('Please destroy some of these instances before making a new one.');
      }
      ip[2] = parseInt(ip[2], 10) + 1;
      ip[3] = '10';
    } else {
      ip[3] = parseInt(ip[3], 10) + 1;
    }
    ip = ip.join('.');
  }

  return ip;
}

export function createInstance(args) {
  return new Promise((resolve, reject) => {
    var ip = nextAvailableIP(args.ip || FIRST_IP);
    log.faded('Using IP address ' + ip + '.');

    args.ip = ip;
    args.dir = OVERCAST_VAGRANT_DIR + '/' + ip;

    var color = utils.getNextColor();

    var bashArgs = [
      utils.escapeWindowsPath(utils.getFileDirname() + '/../../bin/overcast-vagrant')
    ];

    var bashEnv = Object.assign({}, process.env, {
      VM_BOX: args.image,
      VM_IP: args.ip,
      VM_RAM: args.ram,
      VM_CPUS: args.cpus,
      VM_PUB_KEY: args.ssh_pub_key
    });

    var bash = cp.spawn('bash', bashArgs, { env: bashEnv });

    bash.stdout.on('data', data => {
      utils.prefixPrint(args.name, color, data);
    });

    bash.stderr.on('data', data => {
      utils.prefixPrint(args.name, color, data, 'grey');
    });

    bash.on('exit', code => {
      if (code !== 0) {
        reject();
      } else {
        resolve(args);
      }
    });
  });
}

export function stopInstance(instance) {
  return new Promise((resolve, reject) => {
    var color = utils.getNextColor();
    var vagrant = utils.spawn('vagrant halt', {
      cwd: instance.virtualbox.dir
    });

    vagrant.stdout.on('data', data => {
      utils.prefixPrint(instance.name, color, data);
    });

    vagrant.stderr.on('data', data => {
      utils.prefixPrint(instance.name, color, data, 'grey');
    });

    vagrant.on('exit', code => {
      if (code !== 0) {
        reject();
      } else {
        resolve(instance);
      }
    });
  });
}

export function startInstance(instance) {
  return new Promise((resolve, reject) => {
    var color = utils.getNextColor();
    var vagrant = utils.spawn('vagrant up', {
      cwd: instance.virtualbox.dir
    });

    vagrant.stdout.on('data', data => {
      utils.prefixPrint(instance.name, color, data);
    });

    vagrant.stderr.on('data', data => {
      utils.prefixPrint(instance.name, color, data, 'grey');
    });

    vagrant.on('exit', code => {
      if (code !== 0) {
        reject();
      } else {
        resolve(instance);
      }
    });
  });
}

export function destroyInstance(instance) {
  return new Promise((resolve, reject) => {
    var color = utils.getNextColor();
    var vagrant = utils.spawn('vagrant destroy -f', {
      cwd: instance.virtualbox.dir
    });

    vagrant.stdout.on('data', data => {
      utils.prefixPrint(instance.name, color, data);
    });

    vagrant.stderr.on('data', data => {
      utils.prefixPrint(instance.name, color, data, 'grey');
    });

    vagrant.on('exit', code => {
      if (code !== 0) {
        reject();
      } else {
        // cross-platform rm -rf
        utils.rmDir(instance.virtualbox.dir, () => {
          resolve(instance);
        });
      }
    });
  });
}

export function genericCatch(err) {
  return utils.die(err && err.message ? err.message : err);
}
