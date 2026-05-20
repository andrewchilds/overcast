import * as store from '../../src/store.js';
import * as utils from '../../src/utils.js';

describe('utils', () => {
  beforeEach(() => {
    store.clearStore();
  });

  describe('resolveSecretReference', () => {
    it('returns non-string values as-is', () => {
      expect(utils.resolveSecretReference(123)).toBe(123);
      expect(utils.resolveSecretReference(null)).toBe(null);
      expect(utils.resolveSecretReference(undefined)).toBe(undefined);
      expect(utils.resolveSecretReference(true)).toBe(true);
    });

    it('returns plain strings as-is', () => {
      expect(utils.resolveSecretReference('my-secret-value')).toBe('my-secret-value');
      expect(utils.resolveSecretReference('some token here')).toBe('some token here');
    });

    it('resolves env: prefix from environment variables', () => {
      process.env.TEST_SECRET_VAR = 'secret-from-env';
      expect(utils.resolveSecretReference('env:TEST_SECRET_VAR')).toBe('secret-from-env');
      delete process.env.TEST_SECRET_VAR;
    });

    it('returns undefined for missing env: variables', () => {
      delete process.env.NONEXISTENT_VAR;
      expect(utils.resolveSecretReference('env:NONEXISTENT_VAR')).toBe(undefined);
    });

    it('resolves cmd: prefix by executing command', () => {
      const result = utils.resolveSecretReference('cmd:echo hello-from-cmd');
      expect(result).toBe('hello-from-cmd');
    });

    it('trims whitespace from cmd: output', () => {
      const result = utils.resolveSecretReference('cmd:echo "  spaces  "');
      expect(result).toBe('spaces');
    });
  });

  describe('getVariable', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      // Restore environment
      Object.keys(process.env).forEach(key => {
        if (!(key in originalEnv)) {
          delete process.env[key];
        }
      });
    });

    it('returns undefined for missing variables', () => {
      store.setConfigDirs(process.cwd() + '/.overcast');
      const result = utils.getVariable('TOTALLY_MISSING_VAR', {});
      expect(result).toBe(undefined);
    });

    it('prioritizes explicit args over everything', () => {
      store.setConfigDirs(process.cwd() + '/.overcast');
      process.env.TEST_PRIORITY_VAR = 'from-env';
      const result = utils.getVariable('TEST_PRIORITY_VAR', { TEST_PRIORITY_VAR: 'from-args' });
      expect(result).toBe('from-args');
      delete process.env.TEST_PRIORITY_VAR;
    });

    it('prioritizes environment variables over variables.json', () => {
      store.setConfigDirs(process.cwd() + '/.overcast');
      process.env.TEST_NAME = 'from-environment';
      const result = utils.getVariable('TEST_NAME', {});
      expect(result).toBe('from-environment');
      delete process.env.TEST_NAME;
    });

    it('falls back to variables.json when env is not set', () => {
      store.setConfigDirs(process.cwd() + '/.overcast');
      delete process.env.DIGITALOCEAN_API_TOKEN;
      // The test fixtures have empty values, so this should return undefined
      const result = utils.getVariable('DIGITALOCEAN_API_TOKEN', {});
      expect(result).toBe(undefined);
    });
  });

  describe('normalizeKeyPath', () => {
    beforeEach(() => {
      store.setConfigDirs(process.cwd() + '/.overcast');
    });

    it('returns default key path for falsy inputs', () => {
      // normalizeKeyPath falls back to default 'overcast.key' when given falsy input
      // Callers should check for undefined/null before calling if they want empty
      const result = utils.normalizeKeyPath('');
      expect(result).toContain('overcast.key');
    });

    it('expands tilde paths', () => {
      const result = utils.normalizeKeyPath('~/mykey.pem');
      expect(result).not.toContain('~');
      expect(result).toContain('mykey.pem');
    });

    it('expands $HOME paths', () => {
      const result = utils.normalizeKeyPath('$HOME/.ssh/id_rsa');
      expect(result).not.toContain('$HOME');
      expect(result).toContain('.ssh/id_rsa');
    });

    it('returns absolute paths unchanged', () => {
      const result = utils.normalizeKeyPath('/absolute/path/to/key.pem');
      expect(result).toBe('/absolute/path/to/key.pem');
    });

    it('resolves relative paths to keys directory', () => {
      const result = utils.normalizeKeyPath('mykey.key');
      expect(result).toContain('.overcast/keys/mykey.key');
    });
  });

  describe('getNextColor', () => {
    it('sends back the next color and advances the state count', () => {
      expect(utils.getNextColor()).toBe('cyan');
      expect(utils.getNextColor()).toBe('green');
      expect(utils.getNextColor()).toBe('red');
      expect(utils.getNextColor()).toBe('yellow');
      expect(utils.getNextColor()).toBe('magenta');
      expect(utils.getNextColor()).toBe('blue');
      expect(utils.getNextColor()).toBe('white');
      expect(utils.getNextColor()).toBe('cyan');
    })
  });

  describe('deepGet', () => {
    const testObj = {
      a: {
        b: {
          c: {
            d: 123
          }
        },
        e: [
          { f: 9 },
          { g: 10 }
        ]
      }
    };

    const falseyObj = {
      isUndefined: undefined,
      isNull: null,
      isZero: 0,
      isEmptyString: ''
    };

    const testArr = [
      { id: 1, comments: [{ text: 'hello' }, { text: 'goodbye' }] },
      { id: 2, comments: [] }
    ];

    it('handles nested objects', () => {
      expect(utils.deepGet(testObj, 'a.b.c.d')).toBe(123);
    });

    it('handles arrays inside an object', () => {
      expect(utils.deepGet(testObj, 'a.e[0].f')).toBe(9);
    });

    it('handles objects inside an array', () => {
      expect(utils.deepGet(testArr, '[0].comments[1].text')).toBe('goodbye');
    });

    it('returns the default value if query was not found', () => {
      const defaultVal = 'oh no';
      expect(utils.deepGet(testObj, 'invalid.not[0].found', defaultVal)).toBe(defaultVal);
    });

    it('returns undefined if query was not found and no default is set', () => {
      expect(utils.deepGet(testObj, 'invalid.not[0].found')).toBe(undefined);
    });

    it('returns falsey values', () => {
      const defaultVal = 'my default';
      expect(utils.deepGet(falseyObj, 'isUndefined', defaultVal)).toBe(undefined);
      expect(utils.deepGet(falseyObj, 'isNull', defaultVal)).toBe(null);
      expect(utils.deepGet(falseyObj, 'isZero', defaultVal)).toBe(0);
      expect(utils.deepGet(falseyObj, 'isEmptyString', defaultVal)).toBe('');
    });
  });

  describe('deepClone', () => {
    it('creates a deep clone of an object', () => {
      const original = {
        foo: {
          a: 1,
          b: new Date()
        },
        bar: true,
        arr: ['a', 'b', { a: 9 }],
        b: null,
        c: undefined,
        d: 123,
        e: 234.56,
        f: 'asdfjkh',
        fn: () => { return true; },
        r: /[a-z]/i,
      };
      const clone = utils.deepClone(original);
      expect(clone).toEqual(original);
      expect(clone.foo.b).not.toBe(original.foo.b);
      expect(clone.foo.b.getTime()).toBe(original.foo.b.getTime());
      expect(clone.arr).not.toBe(original.arr);
      expect(clone.arr).toEqual(original.arr);
      expect(clone.arr[2].a).toBe(original.arr[2].a);
      expect(clone.fn).toBe(original.fn);
      expect(clone.r).toEqual(original.r);
      expect(clone.r).not.toBe(original.r);
      expect(clone.fn()).toBe(original.fn());
    });

    it('makes a deep clone of an array', () => {
      const original = [1, 2, { a: 1, b: 2 }];
      let clone = utils.deepClone(original);
      expect(clone).not.toBe(original);
      expect(clone).toEqual(original);
    });

    it('makes a clone of an object with object references', () => {
      const other = { a: 1, b: 2 };
      let original = {
        a: other,
        b: {
          a: other
        }
      };
      const clone = utils.deepClone(original);
      expect(clone).toEqual(original);
      other.a = 3;
      expect(clone.a.a).toBe(1);
      expect(clone.b.a.a).toBe(1);
    });

    it('makes a clone of a string', () => {
      let original = 'hello';
      const clone = utils.deepClone(original);
      expect(clone).toBe(original);
      expect(clone).toEqual(original);
      original = 'updated';
      expect(clone).not.toBe(original);
    });

    it('handles undefined', () => {
      const original = undefined;
      const clone = utils.deepClone(original);
      expect(clone).toBe(original);
      expect(clone).toEqual(original);
    });

    it('handles null', () => {
      const original = null;
      const clone = utils.deepClone(original);
      expect(clone).toBe(original);
      expect(clone).toEqual(original);
    });
  });

  describe('findMatchingInstances', () => {
    const subject = utils.findMatchingInstances;
    const clusters = {
      dummy: {
        instances: {
          'dummy.01': { name: 'dummy.01' },
          'dummy.02': { name: 'dummy.02' }
        }
      },
      test: {
        instances: {
          'test-01': { name: 'test-01' },
          'test-02': { name: 'test-02' },
          'test-03': { name: 'test-03' }
        }
      }
    };

    describe('name is "all"', () => {
      it('should return all instances', () => {
        expect(subject('all', clusters)).toEqual([
          { name: 'dummy.01' },
          { name: 'dummy.02' },
          { name: 'test-01' },
          { name: 'test-02' },
          { name: 'test-03' }
        ]);
      });
    });

    describe('name matches a cluster', () => {
      it('should return all instances from that cluster', () => {
        expect(subject('dummy', clusters)).toEqual([
          { name: 'dummy.01' },
          { name: 'dummy.02' }
        ]);
      });
    });

    describe('name matches an instance', () => {
      it('should return the matching instance', () => {
        expect(subject('test-03', clusters)).toEqual([
          { name: 'test-03' }
        ]);
      });
    });

    describe('name includes a wildcard', () => {
      it('should return the matching instances', () => {
        expect(subject('test-0*', clusters)).toEqual([
          { name: 'test-01' },
          { name: 'test-02' },
          { name: 'test-03' }
        ]);
        expect(subject('*01', clusters)).toEqual([
          { name: 'dummy.01' },
          { name: 'test-01' }
        ]);
        expect(subject('*.*', clusters)).toEqual([
          { name: 'dummy.01' },
          { name: 'dummy.02' }
        ]);
      });
    });
  });

  describe('tokenize', () => {
    const subject = utils.tokenize;

    it('should handle double-quoted tokens', () => {
      expect(subject('"my first token" second, third'))
        .toEqual(['my first token', 'second,', 'third']);
    });

    it('should handle single-quotes in double-quoted tokens and vice-versa', () => {
      return expect(subject('"first token\'s value" \'second "token quote"\' third'))
        .toEqual(['first token\'s value', 'second "token quote"', 'third']);
    });

    it('should handle single-quoted tokens', () => {
      return expect(subject('"my first token" \'my second token\' third'))
        .toEqual(['my first token', 'my second token', 'third']);
    });

    it('should handle simple tokens with irregular spacing', () => {
      expect(subject(' first  second --third'))
        .toEqual(['first', 'second', '--third']);
    });

  });

  describe('sanitize', () => {
    const subject = utils.sanitize;

    it('should sanitize the input string', () => {
      expect(subject('foo ~`!@#$%^&*()-=_+[]\\{}|;:\'",./<>?bar'))
        .toBe('foo *-_.bar');
    });

    it('should handle numbers', () => {
      expect(subject(12345)).toBe('12345');
    });

    it('should return empty strings for null and undefined', () => {
      expect(subject(null)).toBe('');
      expect(subject()).toBe('');
    });
  });
});
