#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const projectDir = process.cwd();
const configPath = path.join(projectDir, 'tsconfig.json');
const configText = fs.readFileSync(configPath, 'utf8');
const configJson = JSON.parse(configText);

// Parse the tsconfig.json properly using TypeScript API
const parsedConfig = ts.parseJsonConfigFileContent(
  configJson,
  ts.sys,
  path.dirname(configPath)
);

console.log(`Building ${parsedConfig.fileNames.length} TypeScript files...`);

const program = ts.createProgram(
  parsedConfig.fileNames,
  parsedConfig.options,
  ts.createCompilerHost(parsedConfig.options)
);

const emitResult = program.emit();
const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

diagnostics.forEach(diagnostic => {
  if (diagnostic.file) {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    console.error(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
  } else {
    console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  }
});

if (emitResult.emitSkipped) {
  console.error('Build failed');
  process.exit(1);
}

console.log('✓ Build successful');
