#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const projectDir = process.cwd();
const configPath = path.join(projectDir, 'tsconfig.json');
const configJson = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const compilerOptions = {
  ...configJson.compilerOptions,
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ES2020,
};

const host = ts.createCompilerHost(compilerOptions);
const sourceFiles = [];

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
      walkDir(fullPath);
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
      sourceFiles.push(fullPath);
    }
  }
}

walkDir(path.join(projectDir, 'src'));

console.log(`Building ${sourceFiles.length} TypeScript files...`);

const program = ts.createProgram(sourceFiles, compilerOptions, host);
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
