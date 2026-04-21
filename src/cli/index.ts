#!/usr/bin/env node

/**
 * Command-line interface for the dl-auditor tool.
 * Usage: dl-auditor audit --url <url> [options]
 */

import logger from '../core/logger.js';
import { executeAuditRun, formatAuditResult, AuditRunOptions } from './orchestrator.js';

function showHelp(): void {
  console.log(`
dl-auditor - Automated dataLayer auditing for analytics QA

Usage:
  dl-auditor audit --url <url> [--url <url>] [options]
  dl-auditor report --json <file> [options]
  dl-auditor validate --guide <file> --json <file> [options]

Audit Options:
  --url <url>              Base URL(s) to audit (required, can be repeated)
  --config <file>          Config file (default: config/default.audit.yaml)
  --output <dir>           Output directory (default: output/audit_<timestamp>)
  --headless=true|false    Run headless (default: true)
  --verbose                Show detailed logging
  --help                   Show this help message

Examples:
  dl-auditor audit --url https://example.com
  dl-auditor audit --url https://example.com/page1 --url https://example.com/page2
  dl-auditor audit --url https://example.com --config config/my-config.yaml
  dl-auditor audit --url https://example.com --output ./my-output --verbose
    `);
}

interface ParsedArgs {
  command: string;
  urls: string[];
  configPath?: string;
  outputDir?: string;
  headless: boolean;
  verbose: boolean;
  help: boolean;
}

function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    command: args[0] || 'help',
    urls: [],
    headless: true,
    verbose: false,
    help: false,
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help') {
      parsed.help = true;
    } else if (arg === '--verbose') {
      parsed.verbose = true;
    } else if (arg === '--url') {
      if (i + 1 < args.length) {
        parsed.urls.push(args[++i]);
      }
    } else if (arg === '--config' || arg === '--config-file') {
      if (i + 1 < args.length) {
        parsed.configPath = args[++i];
      }
    } else if (arg === '--output' || arg === '--output-dir') {
      if (i + 1 < args.length) {
        parsed.outputDir = args[++i];
      }
    } else if (arg.startsWith('--headless=')) {
      parsed.headless = arg.split('=')[1] !== 'false';
    }
  }

  return parsed;
}

async function runAudit(urls: string[], options: Partial<AuditRunOptions>): Promise<void> {
  if (urls.length === 0) {
    console.error('Error: At least one --url is required');
    showHelp();
    process.exit(1);
  }

  // Validate URLs
  for (const url of urls) {
    try {
      new URL(url);
    } catch {
      console.error(`Error: Invalid URL "${url}"`);
      process.exit(1);
    }
  }

  const auditOptions: AuditRunOptions = {
    urls,
    configPath: options.configPath,
    outputDir: options.outputDir,
    verbose: options.verbose || false,
    headless: options.headless !== false,
  };

  const result = await executeAuditRun(auditOptions);
  const formatted = formatAuditResult(result);

  console.log(formatted);

  if (!result.success) {
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);

  // Set log level based on verbosity
  if (parsed.verbose) {
    (logger as any).level = 'debug';
  }

  if (parsed.help || !parsed.command) {
    showHelp();
    process.exit(0);
  }

  try {
    switch (parsed.command) {
      case 'audit':
        await runAudit(parsed.urls, {
          configPath: parsed.configPath,
          outputDir: parsed.outputDir,
          verbose: parsed.verbose,
          headless: parsed.headless,
        });
        break;

      case 'report':
        console.log('Report command not yet implemented');
        process.exit(1);
        break;

      case 'validate':
        console.log('Validate command not yet implemented');
        process.exit(1);
        break;

      default:
        console.error(`Error: Unknown command "${parsed.command}"`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    logger.error('Fatal error', { error });
    process.exit(1);
  }
}

main().catch(err => {
  logger.error('Unhandled error', { error: err });
  process.exit(1);
});
