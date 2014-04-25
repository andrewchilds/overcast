fs = require('fs')
cp = require('child_process')
utils = require('../../modules/utils.js')

process.chdir(__dirname)

exports.overcast = (args, callback) ->
  # The jasmine 2.0 approach (using done()) wasn't working with jasmine-node,
  # so going back to the old (1.3) way of doing async.
  done = false
  str = 'node ' + __dirname + '/../../overcast.js ' + args
  cp.exec(str, (err, stdout, stderr) ->
    done = { stdout: stdout, stderr: stderr }
  )
  waitsFor -> done
  runs ->
    console.error done.stderr if done.stderr
    callback(done.stdout, done.stderr)

exports.getClusters = (callback) ->
  clusters = null
  if (utils.CLUSTERS_JSON)
    clusters = require(utils.CLUSTERS_JSON)
  else
    utils.findConfig ->
      clusters = require(utils.CLUSTERS_JSON)
  waitsFor -> clusters
  runs ->
    callback(clusters)
