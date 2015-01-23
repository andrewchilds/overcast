var fs = require('fs');
var AWS = require('aws-sdk');
var Promise = require('bluebird');
var _ = require('lodash');
var utils = require('../utils');

var DEBUG = false;

// http://cloud-images.ubuntu.com/releases/14.04/release/
var DEFAULT_AMI = 'ami-64e27e0c'; // Ubuntu 14.04 64 bit, EBS
var DEFAULT_REGION = 'us-east-1';
var DEFAULT_SIZE = 't1.micro';

exports.id = 'aws';
exports.name = 'AWS';

exports.pollDelay = 3000;

// Provider interface

exports.boot = function (instance, callback) {
  var params = {
    InstanceId: instance.aws.id,
    region: instance.aws.region,
    state: 'running'
  };

  exports.startInstance(params)
    .then(exports.waitForInstanceState)
    .then(exports.getFilteredInstances)
    .catch(exports.catch)
    .then(function (args) {
      utils.updateInstance(instance.name, {
        ip: args.Instances[0].PublicIpAddress,
        aws: {
          id: args.InstanceId,
          size: args.Instances[0].InstanceType,
          image: args.Instances[0].ImageId,
          region: instance.aws.region,
          monitoring: args.Instances[0].Monitoring.State,
          public_dns_name: args.Instances[0].PublicDnsName,
          private_ip: args.Instances[0].PrivateIpAddress,
          private_dns_name: args.Instances[0].PrivateDnsName
        }
      }, callback);
    });
};

exports.create = function (args, callback) {
  if (args['ssh-pub-key']) {
    args.keyPath = args['ssh-pub-key'];
  }

  exports.getKeys(args)
    .then(exports.createKey)
    .then(exports.createInstance)
    .then(function (args) {
      args.InstanceId = args.CreatedInstances[0].InstanceId;
      args.state = 'running';
      return Promise.resolve(args);
    })
    .then(exports.waitForInstanceState)
    .then(exports.getFilteredInstances)
    .catch(exports.catch)
    .then(function (args) {
      var instance = {
        name: args.name,
        ip: args.Instances[0].PublicIpAddress,
        ssh_key: utils.normalizeKeyPath(args['ssh-key']),
        ssh_port: '22',
        user: args.user || 'root',
        aws: {
          id: args.InstanceId,
          size: args.Instances[0].InstanceType,
          image: args.Instances[0].ImageId,
          monitoring: args.Instances[0].Monitoring.State,
          region: args.region || DEFAULT_REGION,
          public_dns_name: args.Instances[0].PublicDnsName,
          private_ip: args.Instances[0].PrivateIpAddress,
          private_dns_name: args.Instances[0].PrivateDnsName
        }
      };

      if (_.isFunction(callback)) {
        callback(instance);
      }
    });
};

exports.destroy = function (instance, callback) {
  var params = {
    InstanceId: instance.aws.id,
    region: instance.aws.region
  };

  exports.destroyInstance(params)
    .catch(exports.catch)
    .then(function (args) {
      if (_.isFunction(callback)) {
        callback();
      }
    });
};

exports.shutdown = function (instance, callback) {
  var params = {
    InstanceId: instance.aws.id,
    region: instance.aws.region,
    state: 'stopped'
  };

  exports.stopInstance(params)
    .then(exports.waitForInstanceState)
    .catch(exports.catch)
    .then(function (args) {
      if (_.isFunction(callback)) {
        callback();
      }
    });
};

exports.reboot = function (instance, callback) {
  var params = {
    InstanceId: instance.aws.id,
    region: instance.aws.region,
    state: 'running'
  };

  exports.rebootInstance(params)
    .then(exports.waitForInstanceState)
    .then(exports.getFilteredInstances)
    .catch(exports.catch)
    .then(function (args) {
      utils.updateInstance(instance.name, {
        ip: args.Instances[0].PublicIpAddress,
        aws: {
          id: args.InstanceId,
          size: args.Instances[0].InstanceType,
          image: args.Instances[0].ImageId,
          monitoring: args.Instances[0].Monitoring.State,
          region: instance.aws.region,
          public_dns_name: args.Instances[0].PublicDnsName,
          private_ip: args.Instances[0].PrivateIpAddress,
          private_dns_name: args.Instances[0].PrivateDnsName
        }
      }, callback);
    });
};

exports.getRegions = function (callback) {
  exports.describeRegions()
    .catch(exports.catch)
    .then(function (args) {
      _.each(args.Regions, function (region) {
        region._name = region.RegionName;
      });

      if (_.isFunction(callback)) {
        callback(args.Regions);
      }
    });
};

exports.getInstances = function (args, callback) {
  exports.getFilteredInstances(args)
    .catch(exports.catch)
    .then(function (args) {
      _.each(args.Instances, function (instance) {
        instance._name = instance.InstanceId;
      });

      if (_.isFunction(callback)) {
        callback(args.Instances);
      }
    });
};

// Internal functions

function debugLog(data) {
  if (DEBUG) {
    console.log(JSON.stringify(data, null, 2));
  }
}

var ec2 = function (args) {
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
    secretAccessKey: vars.AWS_SECRET,
    region: args.region || DEFAULT_REGION
  });

  exports.ec2 = new AWS.EC2();
  return exports.ec2;
};

// TODO: Get setRegion working. Seems like the endpoint needs to be updated as well.
exports.setRegion = function (args) {
  args = args || {};

  return new Promise(function (resolve) {
    AWS.config.update({
      region: args.region || DEFAULT_REGION
    });
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

    ec2(args).importKeyPair(params, function (err, data) {
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
    ec2(args).describeKeyPairs({}, function (err, data) {
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

exports.describeRegions = function (args) {
  args = args || {};

  return new Promise(function (resolve, reject) {
    ec2(args).describeRegions({}, function (err, data) {
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
    ec2(args).describeImages({
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

exports.getFilteredInstances = function (args) {
  args = args || {};

  return new Promise(function (resolve, reject) {
    ec2(args).describeInstances({
      Filters: args.Filters || [],
      InstanceIds: args.InstanceIds || args.InstanceId ? [args.InstanceId] : []
    }, function (err, data) {
      if (err) {
        reject(err);
      } else {
        debugLog(data);
        if (data.Reservations[0]) {
          args.Instances = data.Reservations[0].Instances;
        } else {
          args.Instances = [];
        }
        resolve(args);
      }
    });
  });
};

exports.waitForInstanceState = function (args) {
  args = args || {};
  var state = {};

  function whileFn() {
    return !(state.Code === args.state || state.Name === args.state);
  }

  function checkState() {
    return Promise.delay(exports.pollDelay)
      .then(function () {
        return exports.getFilteredInstances(args);
      }).then(function (args) {
        state = args.Instances[0].State;
        return Promise.resolve();
      });
  }

  return utils.promiseWhile(whileFn, checkState).then(function () {
    return Promise.resolve(args);
  });
};

exports.createInstance = function (args) {
  args = args || {};
  var keyPath = utils.normalizeKeyPath(args.keyPath || utils.CONFIG_DIR + '/keys/overcast.key.pub');
  var keyData = fs.readFileSync(keyPath, 'utf8');

  var params = {
    ImageId: args.image || args.ami || DEFAULT_AMI,
    InstanceType: args.size || DEFAULT_SIZE,
    KeyName: utils.createHashedKeyName(keyData),
    MinCount: 1,
    MaxCount: 1,
    Monitoring: {
      Enabled: utils.argIsTruthy(args.monitoring)
    },
    SecurityGroupIds: args['security-group-ids'].split(' ') || []
  };

  return new Promise(function (resolve, reject) {
    ec2(args).runInstances(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        debugLog(data);
        var tagParams = {
          Resources: [data.Instances[0].InstanceId],
          Tags: [
            { Key: 'Name', Value: args.name }
          ]
        };
        ec2(args).createTags(tagParams, function (err) {
          if (err) {
            reject(err);
          } else {
            args.CreatedInstances = data.Instances;
            resolve(args);
          }
        });
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
    ec2(args).terminateInstances(params, function (err, data) {
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
    ec2(args).rebootInstances(params, function (err, data) {
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
    ec2(args).stopInstances(params, function (err, data) {
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
    ec2(args).startInstances(params, function (err, data) {
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
