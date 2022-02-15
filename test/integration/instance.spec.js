import { overcast, tearDown } from './utils.js';

describe('instance', () => {
  beforeAll((done) => {
    tearDown(() => {
      overcast('init', () => {
        done();
      });
    });
  });

  describe('add', () => {
    it('should allow me to add an instance', (done) => {
      overcast('cluster add instance-test', () => {
        overcast('instance add instance.01 127.0.0.1 --cluster instance-test', ({ stdout }) => {
          expect(stdout).toContain('Instance "instance.01" (127.0.0.1) has been added ' +
            'to the "instance-test" cluster');
          done();
        });
      });
    });
  });

  describe('get', () => {
    it('should output the instance attributes', (done) => {
      overcast('instance get instance.01 ip', ({ stdout }) => {
        expect(stdout).toContain('127.0.0.1');
        done();
      });
    });
  });

  describe('list', () => {
    it('should list all instances', (done) => {
      overcast('instance list', ({ stdout }) => {
        expect(stdout).toContain('instance.01');
        done();
      });
    });
  });

  describe('update', () => {
    it('should allow me to rename an instance', (done) => {
      overcast('instance update instance.01 --name instance.01.renamed', ({ stdout }) => {
        expect(stdout).toContain('Instance "instance.01" has been renamed to "instance.01.renamed".');
        done();
      });
    });
  });

  describe('remove', () => {
    it('should allow me to remove an instance', (done) => {
      overcast('instance remove instance.01.renamed', ({ stdout }) => {
        expect(stdout).toContain('Instance "instance.01.renamed" removed');
        overcast('cluster remove instance-test', ({ stdout }) => {
          expect(stdout).toContain('Cluster "instance-test" has been removed');
          done();
        });
      });
    });
  });

});
