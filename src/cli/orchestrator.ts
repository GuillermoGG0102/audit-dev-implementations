/**
 * Audit orchestration.
 * Coordinates configuration loading, audit execution, and output generation.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import logger from '../core/logger.js';
import { AuditConfig, PageAuditResult } from '../core/types.js';
import { loadAuditConfig } from '../core/config.js';
import { auditPage, auditPages } from '../audit/page-audit.js';

export interface AuditRunOptions {
  urls: string[];
  configPath?: string;
  configOverrides?: Partial<AuditConfig>;
  outputDir?: string;
  verbose?: boolean;
  headless?: boolean;
}

export interface AuditRunResult {
  success: boolean;
  results: PageAuditResult[];
  outputPath: string;
  duration: number;
  message: string;
}

/**
 * Execute complete audit run with all pages and output generation.
 */
export async function executeAuditRun(options: AuditRunOptions): Promise<AuditRunResult> {
  const startTime = Date.now();

  try {
    logger.info('Starting audit run', { urls: options.urls.length });

    // Load configuration
    const overrides = { ...options.configOverrides };
    if (overrides.browser) {
      overrides.browser = { ...overrides.browser, headless: options.headless ?? overrides.browser.headless ?? true };
    } else {
      overrides.browser = { headless: options.headless ?? true } as any;
    }
    const config = await loadAuditConfig(options.configPath, overrides);

    if (options.verbose) {
      logger.debug('Loaded configuration', config);
    }

    // Determine output directory
    const outputDir = options.outputDir || generateOutputDirectory();
    ensureOutputDirectory(outputDir);

    logger.info('Audit output will be saved to', { outputDir });

    // Execute audits
    let auditResults: PageAuditResult[] = [];

    if (options.urls.length === 1) {
      // Single page audit
      logger.info('Running single-page audit', { url: options.urls[0] });

      const pageAuditOptions = {
        browserConfig: config.browser,
        consentConfig: config.consent,
        captureScreenshots: config.capture.screenshots,
        captureDOMSnapshots: config.capture.domSnapshot,
        deduplicateEvents: true,
        maxEventsToWaitFor: 50,
        eventWaitTimeoutMs: 5000,
      };

      const result = await auditPage(options.urls[0], pageAuditOptions);
      auditResults = [result];
    } else {
      // Multi-page audit
      logger.info('Running multi-page audit', { urls: options.urls.length });

      const pageAuditOptions = {
        browserConfig: config.browser,
        consentConfig: config.consent,
        captureScreenshots: config.capture.screenshots,
        captureDOMSnapshots: config.capture.domSnapshot,
        deduplicateEvents: true,
        maxEventsToWaitFor: 50,
        eventWaitTimeoutMs: 5000,
      };

      auditResults = await auditPages(options.urls, pageAuditOptions);
    }

    // Save results
    saveAuditResults(outputDir, auditResults);
    saveAuditConfig(outputDir, config);
    saveSummary(outputDir, auditResults);

    const duration = Date.now() - startTime;

    logger.info('Audit run completed successfully', {
      duration,
      urls: options.urls.length,
      outputDir,
    });

    return {
      success: true,
      results: auditResults,
      outputPath: outputDir,
      duration,
      message: `Audit completed: ${auditResults.length} pages audited, ${getTotalEventCount(auditResults)} events captured`,
    };
  } catch (error) {
    logger.error('Audit run failed', { error });

    const duration = Date.now() - startTime;

    return {
      success: false,
      results: [],
      outputPath: options.outputDir || '',
      duration,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate output directory based on timestamp.
 */
function generateOutputDirectory(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + Date.now().toString().slice(-6);
  return resolve(process.cwd(), 'output', `audit_${timestamp}`);
}

/**
 * Ensure output directory exists.
 */
function ensureOutputDirectory(dir: string): void {
  try {
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(dir, 'screenshots'), { recursive: true });
    mkdirSync(join(dir, 'evidence'), { recursive: true });
    logger.debug('Output directories created', { dir });
  } catch (error) {
    logger.warn('Error creating output directories', { error });
  }
}

/**
 * Save audit results to JSON file.
 */
function saveAuditResults(outputDir: string, results: PageAuditResult[]): string {
  try {
    const path = join(outputDir, 'audit-results.json');

    const serializable = results.map(result => ({
      ...result,
      interactionEvents: Object.fromEntries(result.interactionEvents),
    }));

    writeFileSync(path, JSON.stringify(serializable, null, 2), 'utf-8');

    logger.info('Audit results saved', { path });
    return path;
  } catch (error) {
    logger.warn('Failed to save audit results', { error });
    return '';
  }
}

/**
 * Save configuration used for audit.
 */
function saveAuditConfig(outputDir: string, config: AuditConfig): string {
  try {
    const path = join(outputDir, 'config.json');

    writeFileSync(path, JSON.stringify(config, null, 2), 'utf-8');

    logger.info('Audit config saved', { path });
    return path;
  } catch (error) {
    logger.warn('Failed to save audit config', { error });
    return '';
  }
}

/**
 * Save audit summary (quick overview).
 */
function saveSummary(outputDir: string, results: PageAuditResult[]): string {
  try {
    const path = join(outputDir, 'summary.json');

    const summary = {
      timestamp: new Date().toISOString(),
      totalPages: results.length,
      successfulPages: results.filter(r => r.warnings.length === 0).length,
      failedPages: results.filter(r => r.warnings.some(w => w.severity === 'error')).length,
      totalEvents: getTotalEventCount(results),
      totalEventTypes: new Set(results.flatMap(r => r.pageEvents.map(e => e.eventName))).size,
      warnings: results.flatMap(r => r.warnings),
      pages: results.map(r => ({
        url: r.url,
        events: r.pageEvents.length,
        warnings: r.warnings.length,
        duration: r.endTime.getTime() - r.startTime.getTime(),
      })),
    };

    writeFileSync(path, JSON.stringify(summary, null, 2), 'utf-8');

    logger.info('Audit summary saved', { path });
    return path;
  } catch (error) {
    logger.warn('Failed to save audit summary', { error });
    return '';
  }
}

/**
 * Get total event count across all results.
 */
function getTotalEventCount(results: PageAuditResult[]): number {
  return results.reduce((sum, r) => sum + r.pageEvents.length, 0);
}

/**
 * Format audit run result for console output.
 */
export function formatAuditResult(result: AuditRunResult): string {
  const lines: string[] = [];

  lines.push('\n' + '='.repeat(60));
  lines.push('AUDIT RUN COMPLETE');
  lines.push('='.repeat(60));

  if (result.success) {
    lines.push(`✓ Status: Success`);
    lines.push(`  Message: ${result.message}`);
    lines.push(`  Duration: ${(result.duration / 1000).toFixed(2)}s`);
    lines.push(`  Output: ${result.outputPath}`);

    if (result.results.length > 0) {
      lines.push('\nResults by Page:');
      for (const page of result.results) {
        lines.push(`  • ${page.url}`);
        lines.push(`    - Events: ${page.pageEvents.length}`);
        lines.push(`    - Warnings: ${page.warnings.length}`);
        if (page.warnings.length > 0) {
          for (const warn of page.warnings) {
            lines.push(`      [${warn.severity.toUpperCase()}] ${warn.message}`);
          }
        }
      }
    }
  } else {
    lines.push(`✗ Status: Failed`);
    lines.push(`  Error: ${result.message}`);
    lines.push(`  Duration: ${(result.duration / 1000).toFixed(2)}s`);
  }

  lines.push('='.repeat(60) + '\n');

  return lines.join('\n');
}
