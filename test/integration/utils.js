import cp from 'child_process';

export const overcast = (args, done) => {
  const str = 'TEST_RUN=true node ../overcast.js ' + args;
  cp.exec(str, (err, stdout, stderr) => {
    done({ err, stdout });
  });
};

export const tearDown = (done = () => {}) => {
  cp.exec('rm -rf .overcast', (err, stdout, stderr) => {
    done();
  });
};
