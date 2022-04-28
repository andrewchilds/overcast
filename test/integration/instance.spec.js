import { getClusters, saveClusters } from '../../src/utils.js';
import { overcast, tearDown, expectInLog, expectInLogExact } from './utils.js';

describe('instance', () => {
  beforeAll((nextFn) => {
    tearDown(nextFn);
  });

  describe('add', () => {
    it('should complain if no instance name or IP is provided', (nextFn) => {
      overcast('instance add', (logs) => {
        expectInLog(expect, logs, 'Missing [name] argument');
        expectInLog(expect, logs, 'Missing [ip] argument');
        nextFn();
      });
    });

    it('should allow me to add an instance', (nextFn) => {
      overcast('cluster add instance-test', () => {
        overcast('instance add instance.01 127.0.0.1 --cluster instance-test', (logs) => {
          expectInLog(expect, logs, 'Instance "instance.01" (127.0.0.1) has been added to the "instance-test" cluster');
          overcast('instance add instance.02 1.2.3.4 --cluster instance-test', (logs) => {
            expectInLog(expect, logs, 'Instance "instance.02" (1.2.3.4) has been added to the "instance-test" cluster');
            nextFn();
          });
        });
      });
    });

    it('should complain if instance name already exists as a cluster', (nextFn) => {
      overcast('instance add instance-test', (logs) => {
        expectInLog(expect, logs, '"instance-test" is already in use as a cluster name');
        nextFn();
      });
    });

    it('should complain if instance name already exists as an instance', (nextFn) => {
      overcast('instance add instance.01', (logs) => {
        expectInLog(expect, logs, 'Instance "instance.01" already exists');
        nextFn();
      });
    });

  });

  describe('get', () => {
    it('should complain if no instance name is provided', (nextFn) => {
      overcast('instance get', (logs) => {
        expectInLog(expect, logs, 'Missing [instance|cluster|all] argument');
        nextFn();
      });
    });

    it('should complain if a non-existing instance name is provided', (nextFn) => {
      overcast('instance get missing-01', (logs) => {
        expectInLog(expect, logs, 'No instances found matching "missing-01"');
        nextFn();
      });
    });

    it('should complain if no key is provided', (nextFn) => {
      overcast('instance get instance.01', (logs) => {
        expectInLog(expect, logs, 'Missing [attr...] argument');
        nextFn();
      });
    });

    it('should output the instance attributes', (nextFn) => {
      overcast('instance get instance.01 name ip', (logs) => {
        expectInLogExact(expect, logs, 'instance.01');
        expectInLogExact(expect, logs, '127.0.0.1');
        nextFn();
      });
    });

    it('should output the nested instance attributes', (nextFn) => {
      const clusters = getClusters();
      // 'instance-test': { instances: { 'instance.01': [Object], 'instance.02': [Object] } }
      clusters['instance-test'].instances['instance.01'].nested = {
        a: {
          b: [
            { c: 'foo' },
            { d: 'bar' }
          ]
        }
      };
      saveClusters(clusters, () => {
        overcast('instance get instance.01 nested.a.b[1].d', (logs) => {
          expectInLogExact(expect, logs, 'bar');
          nextFn();
        });
      });
    });

    it('should handle --single-line option', (nextFn) => {
      overcast('instance get instance.* origin --single-line', (logs) => {
        expectInLogExact(expect, logs, 'root@127.0.0.1:22 root@1.2.3.4:22');
        nextFn();
      });
    });
  });

  describe('list', () => {
    it('should list all instances', (nextFn) => {
      overcast('instance list', (logs) => {
        expectInLogExact(expect, logs, 'instance.01');
        expectInLogExact(expect, logs, 'instance.02');
        nextFn();
      });
    });
  });

  describe('update', () => {
    it('should complain if no instance name is provided', (nextFn) => {
      overcast('instance update', (logs) => {
        expectInLog(expect, logs, 'Missing [instance|cluster|all] argument');
        nextFn();
      });
    });

    it('should complain if an incorrect cluster name is provided', (nextFn) => {
      overcast('instance update instance.01 --cluster NEW_CLUSTER', (logs) => {
        expectInLog(expect, logs, 'No "NEW_CLUSTER" cluster found.');
        nextFn();
      });
    });

    it('should allow me to move an instance to a different cluster', (nextFn) => {
      overcast('cluster add NEW_CLUSTER', () => {
        overcast('instance update instance.01 --cluster NEW_CLUSTER', (logs) => {
          expectInLog(expect, logs, 'Instance "instance.01" has been moved to the "NEW_CLUSTER" cluster.');
          nextFn();
        });
      });
    });

    it('should allow me to rename an instance', (nextFn) => {
      overcast('instance update instance.01 --name instance.01.renamed', (logs) => {
        expectInLog(expect, logs, 'Instance "instance.01" has been renamed to "instance.01.renamed"');
        nextFn();
      });
    });
  });

  describe('remove', () => {
    it('should complain if no instance name is provided', (nextFn) => {
      overcast('instance remove', (logs) => {
        expectInLog(expect, logs, 'Missing [name] argument');
        nextFn();
      });
    });

    it('should complain if an incorrect instance name is provided', (nextFn) => {
      overcast('instance remove MISSING_NAME', (logs) => {
        expectInLog(expect, logs, 'No instance found matching "MISSING_NAME".');
        nextFn();
      });
    });

    it('should allow me to remove an instance', (nextFn) => {
      overcast('instance remove instance.01.renamed', (logs) => {
        expectInLog(expect, logs, 'Instance "instance.01.renamed" removed');
        overcast('cluster remove instance-test', (logs) => {
          expectInLog(expect, logs, 'Cluster "instance-test" has been removed');
          nextFn();
        });
      });
    });
  });

});
