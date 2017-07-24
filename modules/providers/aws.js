var fs = require('fs');
var AWS = require('aws-sdk');
var _ = require('lodash');
var utils = require('../utils');

var DEBUG = false;

// https://cloud-images.ubuntu.com/locator/ec2/
// us-east-1 trusty 14.04 LTS amd64 hvm:ebs 20170718 ami-012f3917 hvm
var DEFAULT_AMI = 'ami-012f3917';
var DEFAULT_REGION = 'us-east-1';
var DEFAULT_SIZE = 't2.micro';

var POLL_DELAY = 1000;

exports.id = 'aws';
exports.name = 'AWS';

// Provider interface

exports.boot = function (instance, callback) {
  var args = {
    InstanceId: instance.aws.id,
    region: instance.aws.region,
    expectedState: 'running'
  };

  var fnArray = [
    exports.startInstance,
    exports.waitForInstanceState,
    exports.getFilteredInstances,
    _updateInstance
  ];

  function _updateInstance(args) {
    var createdInstance = args.Instances[0];

    utils.updateInstance(instance.name, {
      ip: createdInstance.PublicIpAddress,
      aws: {
        id: args.InstanceId,
        size: createdInstance.InstanceType,
        image: createdInstance.ImageId,
        region: instance.aws.region,
        monitoring: createdInstance.Monitoring.State,
        public_dns_name: createdInstance.PublicDnsName,
        private_ip: createdInstance.PrivateIpAddress,
        private_dns_name: createdInstance.PrivateDnsName
      }
    }, callback);
  }

  utils.chainSequence(args, fnArray);
};

exports.create = function (args, callback) {
  if (args['ssh-pub-key']) {
    args.keyPath = args['ssh-pub-key'];
  }

  var fnArray = [
    exports.getKeys,
    exports.createKey,
    exports.createInstance,
    _updateInstanceIdAndState,
    exports.waitForInstanceState,
    exports.getFilteredInstances,
    _finalizeInstanceForSave
  ];

  function _updateInstanceIdAndState(args, callback) {
    args.InstanceId = args.CreatedInstances[0].InstanceId;
    args.expectedState = 'running';

    callback(args);
  }

  function _finalizeInstanceForSave(args) {
    var createdInstance = args.Instances[0];

    var instance = {
      name: args.name,
      ip: args.Instances[0].PublicIpAddress,
      ssh_key: utils.normalizeKeyPath(args['ssh-key']),
      ssh_port: '22',
      user: args.user || 'root',
      aws: {
        id: args.InstanceId,
        size: createdInstance.InstanceType,
        image: createdInstance.ImageId,
        monitoring: createdInstance.Monitoring.State,
        region: args.region || DEFAULT_REGION,
        public_dns_name: createdInstance.PublicDnsName,
        private_ip: createdInstance.PrivateIpAddress,
        private_dns_name: createdInstance.PrivateDnsName
      }
    };

    if (_.isFunction(callback)) {
      callback(instance);
    }
  }

  utils.chainSequence(args, fnArray);
};

exports.destroy = function (instance, callback) {
  var args = {
    InstanceId: instance.aws.id,
    region: instance.aws.region
  };

  exports.destroyInstance(args, callback);
};

exports.shutdown = function (instance, callback) {
  var args = {
    InstanceId: instance.aws.id,
    region: instance.aws.region,
    expectedState: 'stopped'
  };

  var fnArray = [
    exports.stopInstance,
    exports.waitForInstanceState,
    callback
  ];

  utils.chainSequence(args, fnArray);
};

exports.reboot = function (instance, callback) {
  var args = {
    InstanceId: instance.aws.id,
    region: instance.aws.region,
    expectedState: 'running'
  };

  var fnArray = [
    exports.rebootInstance,
    function (args, callback) {
      utils.fixedWait(15, function () {
        callback(args);
      });
    },
    exports.waitForInstanceState,
    exports.getFilteredInstances,
    _updateInstance
  ];

  function _updateInstance(args) {
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
  }

  utils.chainSequence(args, fnArray);
};

exports.getRegions = function (callback) {
  var args = {};

  var fnArray = [
    exports.describeRegions,
    function (args) {
      _.each(args.Regions, function (region) {
        region._name = region.RegionName;
      });

      if (_.isFunction(callback)) {
        callback(args.Regions);
      }
    }
  ];

  utils.chainSequence(args, fnArray);
};

exports.getInstances = function (args, callback) {
  var fnArray = [
    exports.getFilteredInstances,
    function (args) {
      _.each(args.Instances, function (instance) {
        instance._name = instance.InstanceId;
      });

      if (_.isFunction(callback)) {
        callback(args.Instances);
      }
    }
  ];

  utils.chainSequence(args, fnArray);
};

// Internal functions

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
exports.setRegion = function (args, callback) {
  args = args || {};

  AWS.config.update({
    region: args.region || DEFAULT_REGION
  });

  callback(args);
};

exports.createKey = function (args, callback) {
  args = args || {};

  var keyPath = utils.normalizeKeyPath(args.keyPath || utils.CONFIG_DIR + '/keys/overcast.key.pub');
  var keyData = fs.readFileSync(keyPath, 'utf8');
  var keyName = utils.createHashedKeyName(keyData);

  if (args.KeyPairs) {
    if (_.find(args.KeyPairs, { KeyName: keyName })) {
      return callback(args);
    }
  }

  var params = {
    KeyName: keyName,
    PublicKeyMaterial: new Buffer(keyData)
  };

  ec2(args).importKeyPair(params, function (err, data) {
    if (err) {
      _catch(err);
    } else {
      _debugLog(data);
      utils.grey('Created keyPair "' + keyName + '".');
      callback(args);
    }
  });
};

exports.getKeys = function (args, callback) {
  args = args || {};

  ec2(args).describeKeyPairs({}, function (err, data) {
    if (err) {
      _catch(err);
    } else {
      _debugLog(data);
      args.KeyPairs = data.KeyPairs;
      callback(args);
    }
  });
};

exports.describeRegions = function (args, callback) {
  args = args || {};

  ec2(args).describeRegions({}, function (err, data) {
    if (err) {
      _catch(err);
    } else {
      _debugLog(data);
      args.Regions = data.Regions;
      callback(args);
    }
  });
};

exports.getImages = function (args, callback) {
  args = args || {};

  var params = {};
  _.each(['ImageIds', 'Owners', 'Filters'], function (k) {
    if (args[k]) {
      params[k] = args[k];
    }
  });

  ec2(args).describeImages(params, function (err, data) {
    if (err) {
      _catch(err);
    } else {
      _debugLog(data);
      args.Images = data.Images;
      callback(args);
    }
  });
};

exports.getFilteredInstances = function (args, callback) {
  args = args || {};
  var params = {};

  if (args.InstanceIds) {
    params.InstanceIds = args.InstanceIds;
  }
  if (args.InstanceId) {
    params.InstanceIds = [args.InstanceId];
  }
  if (args.Filters) {
    params.Filters = args.Filters;
  }

  console.log('getFilteredInstances');
  console.log(params);

  ec2(args).describeInstances(params, function (err, data) {
    if (err) {
      _catch(err);
    } else {
      _debugLog(data);
      if (data.Reservations[0]) {
        args.Instances = data.Reservations[0].Instances;
      } else {
        args.Instances = [];
      }
      callback(args);
    }
  });
};

exports.waitForInstanceState = function (args, callback) {
  args = args || {};

  exports.getFilteredInstances(args, function (err) {
    var state = args.Instances[0].State;

    // Example State object:
    // "State": {
    //   "Code": 16,
    //   "Name": "running"
    // }
    if (state.Name === args.expectedState || state.Code === args.expectedState) {
      delete args.expectedState;
      callback(args);
    } else {
      setTimeout(function () {
        exports.waitForInstanceState(args, callback);
      }, POLL_DELAY);
    }
  });
};

exports.createInstance = function (args, callback) {
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
    }
  };

  if (args['security-group-ids']) {
    params.SecurityGroupIds = args['security-group-ids'].split(' ');
  }

  if (args['availability-zone']) {
    params.Placement = {
      AvailabilityZone: args['availability-zone']
    };
  }

  ec2(args).runInstances(params, function (err, data) {
    if (err) {
      _catch(err);
    } else {
      _debugLog(data);

      var tagParams = {
        Resources: [data.Instances[0].InstanceId],
        Tags: [
          { Key: 'Name', Value: args.name }
        ]
      };
      ec2(args).createTags(tagParams, function (err) {
        if (err) {
          _catch(err);
        } else {
          args.CreatedInstances = data.Instances;
          callback(args);
        }
      });
    }
  });
};

exports.destroyInstance = function (args, callback) {
  args = args || {};
  var params = {
    InstanceIds: args.InstanceIds || [args.InstanceId]
  };

  ec2(args).terminateInstances(params, function (err, data) {
    if (err) {
      _catch(err);
    } else {
      _debugLog(data);
      callback(args);
    }
  });
};

exports.rebootInstance = function (args, callback) {
  args = args || {};
  var params = {
    InstanceIds: args.InstanceIds || [args.InstanceId]
  };

  ec2(args).rebootInstances(params, function (err, data) {
    if (err) {
      _catch(err);
    } else {
      _debugLog(data);
      callback(args);
    }
  });
};

exports.stopInstance = function (args, callback) {
  args = args || {};
  var params = {
    InstanceIds: args.InstanceIds || [args.InstanceId]
  };

  ec2(args).stopInstances(params, function (err, data) {
    if (err) {
      _catch(err);
    } else {
      _debugLog(data);
      callback(args);
    }
  });
};

exports.startInstance = function (args, callback) {
  args = args || {};
  var params = {
    InstanceIds: args.InstanceIds || [args.InstanceId]
  };

  ec2(args).startInstances(params, function (err, data) {
    if (err) {
      _catch(err);
    } else {
      _debugLog(data);
      callback(args);
    }
  });
};

function _debugLog(data) {
  if (DEBUG) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function _catch(err) {
  utils.die(err && err.message ? err.message : err);
}

exports.log = function (args) {
  console.log(JSON.stringify(args, null, 2));
};
