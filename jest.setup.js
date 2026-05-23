// Jest setup — preload shared utilities that consumer modules expect to find
// as globals. At runtime, the concatenated bundle (see build.js) loads
// `src/modules/storage.js` first so every later module can reference the bare
// `StorageUtil` identifier. In Jest, each module is `require()`-d in isolation,
// so we have to seed the global ourselves before any consumer loads.
//
// Add new "expected global" loaders here if you introduce more shared utils.
require('./src/modules/storage.js');
