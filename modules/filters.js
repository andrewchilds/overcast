import utils from './utils';

export function findMatchingInstances(name, args) {
  args.instances = utils.findMatchingInstances(name);

  if (args.instances.length === 0) {
    utils.dieWithList(`No instances found matching "${name}".`);
    return false;
  }
}

export function findFirstMatchingInstance(name, args) {
  args.instance = utils.findFirstMatchingInstance(name);

  if (!args.instance) {
    utils.dieWithList(`No instance found matching "${name}".`);
    return false;
  }
}

export function findMatchingCluster(name, args) {
  const clusters = utils.getClusters();
  args.cluster = clusters[name];

  if (!args.cluster) {
    utils.dieWithList(`No clusters found matching "${name}".`);
    return false;
  }
}

export function shouldBeNewCluster(name, args) {
  const clusters = utils.getClusters();

  if (clusters[name]) {
    utils.grey(`The cluster "${name}" already exists, no action taken.`);
    return false;
  }
}

export function shouldBeNewInstance(name, args) {
  const clusters = utils.getClusters();

  if (!args.cluster) {
    utils.grey('Using "default" cluster.');
    args.cluster = 'default';
  }

  if (clusters[name]) {
    utils.die(`"${name}" is already in use as a cluster name.`);
    return false;
  } else if (name === 'all') {
    utils.die('"all" is a special keyword that cannot be used for instance names.');
    return false;
  } else if (name.indexOf('*') !== -1) {
    utils.die('Instance names cannot include asterisk characters.');
    return false;
  } else if (utils.findMatchingInstancesByInstanceName(name).length > 0) {
    utils.die(`Instance "${name}" already exists.`);
    return false;
  }
}

export function shouldBeNewKey(name, args) {
  if (utils.keyExists(name)) {
    utils.grey(`The key "${name}" already exists, no action taken.`);
    return false;
  }
}

export function shouldBeExistingKey(name, args) {
  if (!utils.keyExists(name)) {
    utils.grey(`The key "${name}" was not found, no action taken.`);
    return false;
  }
}

export function shouldBeAWS(name, args) {
  if (!args.instance || !args.instance.aws) {
    utils.die('This instance has no AWS metadata attached.');
    return false;
  }
}

export function shouldBeDigitalOcean(name, args) {
  if (!args.instance || !args.instance.digitalocean) {
    utils.red('This instance has no DigitalOcean metadata attached.');
    utils.red('Run this command and then try again:');
    utils.die(`overcast digitalocean sync "${args.instance.name}"`);
    return false;
  }
}

export function shouldBeVirtualbox(name, args) {
  if (!args.instance || !args.instance.virtualbox) {
    utils.die('This instance has no Virtualbox metadata attached.');
    return false;
  }
}

export function shouldBeLinode(name, args) {
  if (!args.instance || !args.instance.linode) {
    utils.red('This instance has no Linode metadata attached.');
    utils.red('Run this command and then try again:');
    utils.die(`overcast linode sync "${args.instance.name}"`);
    return false;
  }
}
