/**
 * Single-page audit orchestration.
 * Coordinates browser automation, event capture, and normalization.
 */

import { Browser, Page } from 'playwright';
import logger from '../core/logger.js';
import { PageAuditResult, BrowserConfig, ConsentConfig } from '../core/types.js';
import { launchBrowser, navigateToUrl, closePage } from '../browser/launch.js';
import { handleConsentBanners } from '../browser/consent.js';
import { collectCapturedEvents, waitForCapturedEvents } from '../capture/event-collector.js';
import { normalizeRawEvents } from './normalizer.js';
import { capturePageLoadEvidence, collectEventEvidence } from './evidence.js';

export interface PageAuditOptions {
  browserConfig: BrowserConfig;
  consentConfig: ConsentConfig;
  captureScreenshots: boolean;
  captureDOMSnapshots: boolean;
  deduplicateEvents: boolean;
  maxEventsToWaitFor: number;
  eventWaitTimeoutMs: number;
}

/**
 * Audit a single page for dataLayer events.
 * Orchestrates the full flow: launch browser → navigate → capture → normalize.
 */
export async function auditPage(
  url: string,
  options: PageAuditOptions,
  browser?: Browser,
): Promise<PageAuditResult> {
  let page: Page | null = null;
  let ownBrowser = false;

  try {
    const startTime = new Date();
    logger.info('Starting page audit', { url });

    // Launch browser if not provided
    if (!browser) {
      browser = await launchBrowser(options.browserConfig);
      ownBrowser = true;
    }

    // Navigate to page
    // Hooks are already injected at context level in navigateToUrl
    page = await navigateToUrl(browser, url, options.browserConfig);
    logger.info('Page navigated', { url });

    // Handle consent banners
    const consentHandled = await handleConsentBanners(page, options.consentConfig);
    logger.debug('Consent banners handled', { handled: consentHandled });

    // Capture page load evidence
    const pageLoadEvidence = await capturePageLoadEvidence(page, Date.now());
    logger.debug('Page load evidence captured', { count: pageLoadEvidence.length });

    // Wait for initial events to fire
    const eventCount = await waitForCapturedEvents(page, 1, options.eventWaitTimeoutMs);
    logger.debug('Events captured after page load', { count: eventCount });

    // Collect all captured events
    const rawEvents = await collectCapturedEvents(page);
    logger.info('Raw events collected', { count: rawEvents.length });

    // Enrich events with evidence
    const allEvidence = pageLoadEvidence;
    for (const event of rawEvents) {
      const eventEvidence = await collectEventEvidence(
        page,
        event,
        options.captureScreenshots,
        options.captureDOMSnapshots,
      );
      allEvidence.push(...eventEvidence);
    }

    // Normalize events
    const normalizedEvents = normalizeRawEvents(rawEvents, url, allEvidence);
    logger.info('Events normalized', { count: normalizedEvents.length });

    const endTime = new Date();

    const result: PageAuditResult = {
      url,
      startTime,
      endTime,
      pageEvents: normalizedEvents.filter(e => e.triggeredBy === 'pageLoad'),
      interactionEvents: new Map(),
      warnings: [],
      rawCapture: rawEvents,
    };

    logger.info('Page audit completed', {
      url,
      duration: endTime.getTime() - startTime.getTime(),
      events: normalizedEvents.length,
    });

    return result;
  } catch (error) {
    logger.error('Page audit failed', { url, error });

    const result: PageAuditResult = {
      url,
      startTime: new Date(),
      endTime: new Date(),
      pageEvents: [],
      interactionEvents: new Map(),
      warnings: [
        {
          code: 'AUDIT_FAILED',
          message: error instanceof Error ? error.message : String(error),
          severity: 'error',
          url,
        },
      ],
      rawCapture: [],
    };

    return result;
  } finally {
    // Cleanup
    if (page) {
      await closePage(page).catch(err => logger.warn('Error closing page', { error: err }));
    }

    if (ownBrowser && browser) {
      await browser.close().catch(err => logger.warn('Error closing browser', { error: err }));
    }
  }
}

/**
 * Audit multiple pages sequentially.
 */
export async function auditPages(
  urls: string[],
  options: PageAuditOptions,
): Promise<PageAuditResult[]> {
  logger.info('Starting multi-page audit', { count: urls.length });

  const results: PageAuditResult[] = [];
  let browser: Browser | null = null;

  try {
    // Launch browser once for all pages
    browser = await launchBrowser(options.browserConfig);

    for (const url of urls) {
      try {
        const result = await auditPage(url, options, browser);
        results.push(result);

        // Small delay between pages
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        logger.error('Error auditing URL', { url, error });

        results.push({
          url,
          startTime: new Date(),
          endTime: new Date(),
          pageEvents: [],
          interactionEvents: new Map(),
          warnings: [
            {
              code: 'PAGE_AUDIT_ERROR',
              message: error instanceof Error ? error.message : String(error),
              severity: 'error',
              url,
            },
          ],
          rawCapture: [],
        });
      }
    }

    logger.info('Multi-page audit completed', { count: urls.length });
  } finally {
    if (browser) {
      await browser.close().catch(err => logger.warn('Error closing browser', { error: err }));
    }
  }

  return results;
}
