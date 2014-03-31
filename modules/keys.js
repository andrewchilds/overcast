var exec = require('child_process').exec;
var fs = require('fs');
var utils = require('./utils');

exports.notFound = function () {
  var keyfile = utils.CONFIG_DIR + '/keys/overcast.key';

  return !fs.existsSync(keyfile);
};

exports.create = function (done) {
  var keyfile = utils.CONFIG_DIR + '/keys/overcast.key';
  exec('mkdir -p ' + utils.CONFIG_DIR + '/keys && ssh-keygen -t rsa -N "" -f ' + keyfile + ' && chmod 600 ' + keyfile, function (err) {
    if (err) {
      console.log('Error generating SSH key.');
      console.log(err);
    } else {
      done();
    }
  });
};
