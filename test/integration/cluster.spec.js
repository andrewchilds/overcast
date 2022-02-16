import { overcast, tearDown } from './utils.js';

const name = 'testCluster';

describe('cluster', () => {
  beforeAll((done) => {
    tearDown(() => {
      overcast('init', () => {
        done();
      });
    });
  });

  describe('add', () => {
    it('should fail if there was no name added', (done) => {
      overcast(`cluster add`, ({ stdout }) => {
        expect(stdout).toContain('Missing [name] argument.');
        done();
      });
    });

    it('should allow me to add a new cluster', (done) => {
      overcast(`cluster add ${name}`, ({ stdout }) => {
        expect(stdout).toContain(`Cluster "${name}" has been added`);
        done();
      });
    });
  });

  describe('count', () => {
    it('should return the instance count for an existing cluster', (done) => {
      overcast(`cluster count ${name}`, ({ stdout }) => {
        expect(stdout).toContain('0');
        overcast(`instance add myName 1.2.3.4 --cluster ${name}`, () => {
          overcast(`cluster count ${name}`, ({ stdout }) => {
            expect(stdout).toContain('1');
            done();
          });
        });
      });
    });
  });

  describe('rename', () => {
    it('should not allow me to rename a missing cluster', (done) => {
      overcast(`cluster rename foo bar`, ({ stdout }) => {
        expect(stdout).toContain(`No clusters found matching "foo"`);
        done();
      });
    });

    it('should allow me to rename an existing cluster', (done) => {
      overcast(`cluster rename ${name} foo`, ({ stdout }) => {
        expect(stdout).toContain(`Cluster "${name}" has been renamed to "foo"`);
        overcast('cluster count foo', ({ stdout }) => {
          expect(stdout).toContain('1');
          done();
        });
      });
    });
  });

  describe('remove', () => {
    it('should not allow me to remove a missing cluster', (done) => {
      overcast(`cluster remove bar`, ({ stdout }) => {
        expect(stdout).toContain('No clusters found matching "bar"');
        done();
      });
    });

    it('should allow me to remove an existing cluster, and move instances to an orphaned cluster', (done) => {
      overcast(`cluster remove foo`, ({ stdout }) => {
        expect(stdout).toContain('Cluster "foo" has been removed');
        overcast(`cluster count orphaned`, ({ stdout }) => {
          expect(stdout).toContain('1');
          done();
        });
      });
    });
  });

});
