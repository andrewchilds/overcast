fs = require('fs')
cp = require('child_process')

process.chdir(__dirname)

exports.overcast = (args, callback) ->
  # The jasmine 2.0 approach (using done()) wasn't working with jasmine-node,
  # so going back to the old (1.3) way of doing async.
  done = false
  str = 'node ' + __dirname + '/../overcast.js ' + args
  cp.exec(str, (err, stdout, stderr) ->
    done = { stdout: stdout, stderr: stderr }
  )
  waitsFor -> done
  runs ->
    callback(done.stdout, done.stderr)
