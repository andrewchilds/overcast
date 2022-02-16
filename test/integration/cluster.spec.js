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
      overcast(`cluster add`, (logs) => {
        expect(logs).toContain('Missing [name] argument.');
        done();
      });
    });

    it('should allow me to add a new cluster', (done) => {
      overcast(`cluster add ${name}`, (logs) => {
        expect(logs).toContain(`Cluster "${name}" has been added`);
        done();
      });
    });
  });

  describe('count', () => {
    it('should return the instance count for an existing cluster', (done) => {
      overcast(`cluster count ${name}`, (logs) => {
        expect(logs).toContain('0');
        overcast(`instance add myName 1.2.3.4 --cluster ${name}`, () => {
          overcast(`cluster count ${name}`, (logs) => {
            expect(logs).toContain('1');
            done();
          });
        });
      });
    });
  });

  describe('rename', () => {
    it('should not allow me to rename a missing cluster', (done) => {
      overcast(`cluster rename foo bar`, (logs) => {
        expect(logs).toContain(`No clusters found matching "foo"`);
        done();
      });
    });

    it('should allow me to rename an existing cluster', (done) => {
      overcast(`cluster rename ${name} foo`, (logs) => {
        expect(logs).toContain(`Cluster "${name}" has been renamed to "foo"`);
        overcast('cluster count foo', (logs) => {
          expect(logs).toContain('1');
          done();
        });
      });
    });
  });

  describe('remove', () => {
    it('should not allow me to remove a missing cluster', (done) => {
      overcast(`cluster remove bar`, (logs) => {
        expect(logs).toContain('No clusters found matching "bar"');
        done();
      });
    });

    it('should allow me to remove an existing cluster, and move instances to an orphaned cluster', (done) => {
      overcast(`cluster remove foo`, (logs) => {
        expect(logs).toContain('Cluster "foo" has been removed');
        overcast(`cluster count orphaned`, (logs) => {
          expect(logs).toContain('1');
          done();
        });
      });
    });
  });

});
