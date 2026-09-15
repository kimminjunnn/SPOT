// Node-only harness: compile project TS with the installed TypeScript version.
// Each loader owns its module cache so native/API mocks cannot leak across tests.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
function createLoader(mocks = {}, revision) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(root, file);
    if (!path.extname(file)) file += '.ts';
    if (cache.has(file)) return cache.get(file).exports;
    const source = revision
      ? execFileSync('git', ['show', `${revision}:${path.relative(root, file)}`], { cwd: root, encoding: 'utf8' })
      : fs.readFileSync(file, 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: file,
    }).outputText;
    const mod = { exports: {} };
    cache.set(file, mod);
    const localRequire = (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.startsWith('@/')) return load(id.slice(2));
      if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id));
      return require(id);
    };
    new Function('require', 'module', 'exports', '__DEV__', output)(localRequire, mod, mod.exports, false);
    return mod.exports;
  }
  return load;
}
module.exports = { createLoader, root };
