var fs = require('fs');
var AWS = require('aws-sdk');
var Promise = require('bluebird');
var _ = require('lodash');
var utils = require('../utils');

var DEBUG = false;

exports.pollDelay = 3000;

function debugLog(data) {
  if (DEBUG) {
    console.log(JSON.stringify(data, null, 2));
  }
}

var ec2 = function () {
  if (exports.ec2) {
    return exports.ec2;
  }

  var vars = utils.getVariables();

  if (!vars.AWS_KEY || !vars.AWS_SECRET) {
    utils.red('Missing AWS_KEY or AWS_SECRET.');
    return utils.die('Please add them to ' + utils.VARIABLES_JSON);
  }

  AWS.config.update({
    accessKeyId: vars.AWS_KEY,
    secretAccessKey: vars.AWS_SECRET
  });

  AWS.config.update({
    region: 'us-east-1'
  });

  exports.ec2 = new AWS.EC2();
  return exports.ec2;
};

exports.setRegion = function (args) {
  args = args || {};

  return new Promise(function (resolve) {
    AWS.config.update({ region: args.region || 'us-east-1' });
    resolve(args);
  });
};

exports.createKey = function (args) {
  args = args || {};

  return new Promise(function (resolve, reject) {
    var keyPath = utils.normalizeKeyPath(args.keyPath || utils.CONFIG_DIR + '/keys/overcast.key.pub');
    var keyData = fs.readFileSync(keyPath, 'utf8');
    var keyName = utils.createHashedKeyName(keyData);

    if (args.KeyPairs) {
      if (_.find(args.KeyPairs, { KeyName: keyName })) {
        return resolve(args);
      }
    }

    var params = {
      KeyName: keyName,
      PublicKeyMaterial: new Buffer(keyData).toString('base64')
    };

    ec2().importKeyPair(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        debugLog(data);
        utils.grey('Created keyPair "' + keyName + '".');
        resolve(args);
      }
    });
  });
};

exports.getKeys = function (args) {
  args = args || {};

  return new Promise(function (resolve, reject) {
    ec2().describeKeyPairs({}, function (err, data) {
      if (err) {
        reject(err);
      } else {
        debugLog(data);
        args.KeyPairs = data.KeyPairs;
        resolve(args);
      }
    });
  });
};

exports.getRegions = function (args) {
  args = args || {};

  return new Promise(function (resolve, reject) {
    ec2().describeRegions({}, function (err, data) {
      if (err) {
        reject(err);
      } else {
        debugLog(data);
        args.Regions = data.Regions;
        resolve(args);
      }
    });
  });
};

exports.getImages = function (args) {
  args = args || {};

  return new Promise(function (resolve, reject) {
    ec2().describeImages({
      ImageIds: args.ImageIds || [],
      Owners: args.Owners || [],
      Filters: args.Filters || []
    }, function (err, data) {
      if (err) {
        reject(err);
      } else {
        debugLog(data);
        args.Images = data.Images;
        resolve(args);
      }
    });
  });
};

exports.getInstances = function (args) {
  args = args || {};

  return new Promise(function (resolve, reject) {
    ec2().describeInstances({
      Filters: args.Filters || [],
      InstanceIds: args.InstanceIds || [args.InstanceId]
    }, function (err, data) {
      if (err) {
        reject(err);
      } else {
        debugLog(data);
        args.Instances = data.Reservations[0].Instances;
        resolve(args);
      }
    });
  });
};

exports.waitForInstanceState = function (args) {
  args = args || {};
  var state = {};

  utils.grey('Waiting for instance state "' + args.state + '"...');

  function whileFn() {
    return !(state.Code === args.state || state.Name === args.state);
  }

  function checkState() {
    return Promise.delay(exports.pollDelay)
      .then(function () {
        return exports.getInstances(args);
      }).then(function (args) {
        state = args.Instances[0].State;
        return Promise.resolve();
      });
  }

  return utils.promiseWhile(whileFn, checkState).then(function () {
    utils.success('Done.');
    return Promise.resolve(args);
  });
};

exports.createInstance = function (args) {
  args = args || {};
  var keyPath = utils.normalizeKeyPath(args.keyPath || utils.CONFIG_DIR + '/keys/overcast.key.pub');
  var keyData = fs.readFileSync(keyPath, 'utf8');

  // http://cloud-images.ubuntu.com/releases/14.04/release/
  var params = {
    ImageId: args.ami || 'ami-018c9568', // Ubuntu 14.04 LTS, 64 bit, EBS
    InstanceType: args.size || 't1.micro',
    KeyName: utils.createHashedKeyName(keyData),
    MinCount: 1,
    MaxCount: 1,
    Monitoring: {
      Enabled: !!args.monitoring
    }
  };

  return new Promise(function (resolve, reject) {
    ec2().runInstances(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        debugLog(data);
        args.CreatedInstances = data.Instances;
        utils.success('Instance ' + args.CreatedInstances[0].InstanceId + ' created.');
        resolve(args);
      }
    });
  });
};

exports.destroyInstance = function (args) {
  args = args || {};
  var params = {
    InstanceIds: args.InstanceIds || [args.InstanceId]
  };

  return new Promise(function (resolve, reject) {
    ec2().terminateInstances(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        debugLog(data);
        resolve(args);
      }
    });
  });
};

exports.rebootInstance = function (args) {
  args = args || {};
  var params = {
    InstanceIds: args.InstanceIds || [args.InstanceId]
  };

  return new Promise(function (resolve, reject) {
    ec2().rebootInstances(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        debugLog(data);
        resolve(args);
      }
    });
  });
};

exports.stopInstance = function (args) {
  args = args || {};
  var params = {
    InstanceIds: args.InstanceIds || [args.InstanceId]
  };

  return new Promise(function (resolve, reject) {
    ec2().stopInstances(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        debugLog(data);
        resolve(args);
      }
    });
  });
};

exports.startInstance = function (args) {
  args = args || {};
  var params = {
    InstanceIds: args.InstanceIds || [args.InstanceId]
  };

  return new Promise(function (resolve, reject) {
    ec2().startInstances(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        debugLog(data);
        resolve(args);
      }
    });
  });
};

exports.catch = function (err) {
  utils.die(err && err.message ? err.message : err);
};

exports.log = function (args) {
  console.log(JSON.stringify(args, null, 2));
};
