import { overcast, tearDown, expectInLog, expectInLogExact } from './utils.js';

const name = 'testCluster';

describe('cluster', () => {
  beforeAll((nextFn) => {
    tearDown(nextFn);
  });

  describe('add', () => {
    it('should fail if there was no name added', (nextFn) => {
      overcast(`cluster add`, (logs) => {
        expectInLog(expect, logs, 'Missing [name] argument.');
        nextFn();
      });
    });

    it('should allow me to add a new cluster', (nextFn) => {
      overcast(`cluster add ${name}`, (logs) => {
        expectInLog(expect, logs, `Cluster "${name}" has been added`);
        nextFn();
      });
    });
  });

  describe('count', () => {
    it('should return the instance count for an existing cluster', (nextFn) => {
      overcast(`cluster count ${name}`, (logs) => {
        expectInLogExact(expect, logs, 0);
        overcast(`instance add myName 1.2.3.4 --cluster ${name}`, () => {
          overcast(`cluster count ${name}`, (logs) => {
            expectInLogExact(expect, logs, 1);
            nextFn();
          });
        });
      });
    });
  });

  describe('rename', () => {
    it('should not allow me to rename a missing cluster', (nextFn) => {
      overcast(`cluster rename foo bar`, (logs) => {
        expectInLog(expect, logs, 'No clusters found matching "foo"');
        nextFn();
      });
    });

    it('should allow me to rename an existing cluster', (nextFn) => {
      overcast(`cluster rename ${name} foo`, (logs) => {
        expectInLog(expect, logs, `Cluster "${name}" has been renamed to "foo"`);
        overcast('cluster count foo', (logs) => {
          expectInLogExact(expect, logs, 1);
          nextFn();
        });
      });
    });
  });

  describe('remove', () => {
    it('should not allow me to remove a missing cluster', (nextFn) => {
      overcast(`cluster remove bar`, (logs) => {
        expectInLog(expect, logs, 'No clusters found matching "bar"');
        nextFn();
      });
    });

    it('should allow me to remove an existing cluster, and move instances to an orphaned cluster', (nextFn) => {
      overcast(`cluster remove foo`, (logs) => {
        expectInLog(expect, logs, 'Cluster "foo" has been removed');
        overcast(`cluster count orphaned`, (logs) => {
          expectInLogExact(expect, logs, 1);
          nextFn();
        });
      });
    });
  });

});
