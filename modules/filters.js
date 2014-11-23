var utils = require('./utils');

exports.findMatchingInstances = function (name, args) {
  args.instances = utils.findMatchingInstancesByInstanceName(name);

  if (args.instances.length === 0) {
    utils.dieWithList('No instances found matching "' + name + '".');
  }
};
