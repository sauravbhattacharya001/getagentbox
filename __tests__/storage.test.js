/**
 * @jest-environment jsdom
 */

// Tests for StorageUtil — the shared localStorage wrapper used by all modules.

const fs = require('fs');
const path = require('path');

function loadStorageUtil() {
  const code = fs.readFileSync(
    path.resolve(__dirname, '../src/modules/storage.js'), 'utf8'
  );
  eval(code);
  return StorageUtil;
}

describe('StorageUtil', () => {
  let SU;

  beforeEach(() => {
    localStorage.clear();
    SU = loadStorageUtil();
  });

  // --- isAvailable ---

  test('isAvailable returns true when localStorage works', () => {
    expect(SU.isAvailable()).toBe(true);
  });

  test('isAvailable returns false when localStorage throws', () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('quota'); };
    try {
      const Broken = loadStorageUtil();
      expect(Broken.isAvailable()).toBe(false);
    } finally {
      Storage.prototype.setItem = orig;
    }
  });

  test('isAvailable caches result on repeated calls', () => {
    SU.isAvailable();
    const spy = jest.spyOn(Storage.prototype, 'setItem');
    SU.isAvailable(); // second call should use cache
    const probeCalls = spy.mock.calls.filter(c => c[0] === '__agentbox_storage_probe__');
    expect(probeCalls.length).toBe(0); // cached, no new probe
    spy.mockRestore();
  });

  // --- get / set ---

  test('set stores and get retrieves a string value', () => {
    expect(SU.set('key1', 'hello')).toBe(true);
    expect(SU.get('key1')).toBe('hello');
  });

  test('get returns empty string for missing key with no fallback', () => {
    expect(SU.get('nonexistent')).toBe('');
  });

  test('get returns fallback for missing key', () => {
    expect(SU.get('nonexistent', 'default')).toBe('default');
  });

  test('set returns false when localStorage is unavailable', () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('quota'); };
    try {
      const Broken = loadStorageUtil();
      expect(Broken.set('x', 'y')).toBe(false);
      expect(Broken.get('x', 'fb')).toBe('fb');
    } finally {
      Storage.prototype.setItem = orig;
    }
  });

  test('get handles localStorage.getItem throwing', () => {
    const orig = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new Error('fail'); };
    try {
      expect(SU.get('any', 'safe')).toBe('safe');
    } finally {
      Storage.prototype.getItem = orig;
    }
  });

  // --- getJSON / setJSON ---

  test('setJSON and getJSON round-trip an object', () => {
    const data = { theme: 'dark', count: 42, nested: [1, 2] };
    expect(SU.setJSON('prefs', data)).toBe(true);
    expect(SU.getJSON('prefs', null)).toEqual(data);
  });

  test('getJSON returns fallback for missing key', () => {
    expect(SU.getJSON('nope', { x: 1 })).toEqual({ x: 1 });
  });

  test('getJSON returns fallback for corrupt JSON', () => {
    localStorage.setItem('bad', '{not json!!!');
    expect(SU.getJSON('bad', 'fallback')).toBe('fallback');
  });

  test('setJSON returns false for non-serializable value (circular ref)', () => {
    const obj = {};
    obj.self = obj;
    expect(SU.setJSON('circ', obj)).toBe(false);
  });

  test('setJSON handles primitive values', () => {
    SU.setJSON('num', 42);
    expect(SU.getJSON('num', 0)).toBe(42);
    SU.setJSON('str', 'hello');
    expect(SU.getJSON('str', '')).toBe('hello');
    SU.setJSON('bool', true);
    expect(SU.getJSON('bool', false)).toBe(true);
    SU.setJSON('nil', null);
    expect(SU.getJSON('nil', 'x')).toBe(null);
  });

  // --- remove ---

  test('remove deletes a stored key', () => {
    SU.set('temp', 'value');
    expect(SU.get('temp')).toBe('value');
    SU.remove('temp');
    expect(SU.get('temp')).toBe('');
  });

  test('remove is safe on nonexistent key', () => {
    expect(() => SU.remove('ghost')).not.toThrow();
  });

  test('remove is no-op when localStorage unavailable', () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('quota'); };
    try {
      const Broken = loadStorageUtil();
      expect(() => Broken.remove('anything')).not.toThrow();
    } finally {
      Storage.prototype.setItem = orig;
    }
  });

  // --- edge cases ---

  test('set handles empty string key and value', () => {
    expect(SU.set('', '')).toBe(true);
    expect(SU.get('')).toBe('');
  });

  test('set and get handle unicode strings', () => {
    SU.set('emoji', '🚀✨🎉');
    expect(SU.get('emoji')).toBe('🚀✨🎉');
  });

  test('set overwrites existing key', () => {
    SU.set('k', 'v1');
    SU.set('k', 'v2');
    expect(SU.get('k')).toBe('v2');
  });
});
