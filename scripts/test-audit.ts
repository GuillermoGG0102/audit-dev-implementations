#!/usr/bin/env node

/**
 * Test script to run complete audit against a test site.
 * Run with: npx ts-node scripts/test-audit.ts
 * Or after build: node scripts/test-audit.js --url https://example.com
 */

import { executeAuditRun, formatAuditResult } from '../src/cli/orchestrator.js';
import logger from '../src/core/logger.js';

async function main() {
  const args = process.argv.slice(2);

  // Get URL from command line or use default
  let testUrl = 'https://www.tnkproject.com';

  if (args.length > 0 && args[0].startsWith('--url')) {
    const urlIndex = args.findIndex(arg => arg === '--url');
    if (urlIndex >= 0 && urlIndex + 1 < args.length) {
      testUrl = args[urlIndex + 1];
    }
  }

  console.log(`
╔════════════════════════════════════════════════════════════╗
║                  DL-AUDITOR TEST RUN                       ║
╚════════════════════════════════════════════════════════════╝

Testing audit flow against: ${testUrl}
`);

  try {
    const startTime = Date.now();

    const result = await executeAuditRun({
      urls: [testUrl],
      verbose: true,
      headless: true,
    });

    const duration = Date.now() - startTime;

    console.log(formatAuditResult(result));

    if (result.success) {
      console.log(`\n📊 Audit Statistics:`);
      console.log(`  Total Time: ${(duration / 1000).toFixed(2)}s`);
      console.log(`  Total Events: ${result.results[0]?.pageEvents.length || 0}`);
      console.log(`  Output Location: ${result.outputPath}`);

      if (result.results[0]) {
        const eventTypes = new Set(result.results[0].pageEvents.map(e => e.eventName));
        console.log(`  Event Types: ${Array.from(eventTypes).join(', ')}`);
      }

      console.log(`\n✅ Audit Test Complete!`);
    } else {
      console.log(`\n❌ Audit Test Failed: ${result.message}`);
      process.exit(1);
    }
  } catch (error) {
    logger.error('Test script error', { error });
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
