fs = require('fs')
cp = require('child_process')
utils = require('../../modules/utils.js')

process.chdir(__dirname)

exports.overcast = (args, callback) ->
  # The jasmine 2.0 approach (using done()) wasn't working with jasmine-node,
  # so going back to the old (1.3) way of doing async.
  done = false
  str = 'node ' + __dirname + '/../../bin/overcast ' + args
  cp.exec(str, (err, stdout, stderr) ->
    done = { stdout: stdout, stderr: stderr }
  )
  waitsFor -> done
  runs ->
    console.error done.stderr if done.stderr
    callback(done.stdout, done.stderr)
