// Test-only TypeScript loader. Uses the installed compiler; no runtime dependencies.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === 'server-only') return {};
  if (name.startsWith('@/')) name = path.resolve(__dirname, '../src', name.slice(2));
  return originalLoad.call(this, name, parent, isMain);
};
require.extensions['.ts'] = function (module, filename) {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true, emitDecoratorMetadata: true, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
