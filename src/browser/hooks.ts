/**
 * Browser hooks: JavaScript injection for dataLayer interception setup.
 * Prepares the page to capture all dataLayer.push calls.
 */

import { Page } from 'playwright';
import logger from '../core/logger.js';
import { BrowserError } from '../core/errors.js';

/**
 * Inject dataLayer capture hooks into the page context.
 * Sets up window.__dl_events array and wraps dataLayer.push to capture all events.
 */
export async function injectDataLayerHooks(page: Page): Promise<void> {
  try {
    logger.debug('Injecting dataLayer capture hooks');

    // Inject hook before any scripts run
    await page.addInitScript(() => {
      // Initialize events array
      (window as any).__dl_events = [];
      (window as any).__dl_ready = false;

      // Store original dataLayer if it exists
      const originalDataLayer = (window as any).dataLayer;

      // Create a proxy dataLayer that captures all push calls
      const proxyDataLayer = {
        push: function (event: any) {
          const timestamp = Date.now();
          const capturedEvent = {
            event: event?.event,
            payload: { ...event },
            timestamp,
            url: window.location.href,
          };

          // Store captured event
          (window as any).__dl_events.push(capturedEvent);

          // If original dataLayer exists, also push to it
          if (Array.isArray(originalDataLayer)) {
            originalDataLayer.push(event);
          }

          return capturedEvent;
        },

        // Make the proxy iterable for any code that iterates dataLayer
        [Symbol.iterator]: function* () {
          if (Array.isArray(originalDataLayer)) {
            yield* originalDataLayer;
          }
        },
      };

      // Replace window.dataLayer with proxy
      (window as any).dataLayer = proxyDataLayer;

      // Log injection success
      console.log('[dl-auditor] dataLayer capture hooks injected');
    });

    logger.debug('Hooks injected successfully');
  } catch (error) {
    logger.error('Failed to inject dataLayer hooks', { error });
    throw new BrowserError(
      `Failed to inject dataLayer hooks: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get all captured events from the page.
 * Returns events that were pushed to dataLayer during page load.
 */
export async function getCapturedEvents(page: Page): Promise<any[]> {
  try {
    logger.debug('Retrieving captured events from page');

    const events = await page.evaluate(() => {
      return (window as any).__dl_events || [];
    });

    logger.debug('Events retrieved', { count: events.length });
    return events;
  } catch (error) {
    logger.error('Failed to retrieve captured events', { error });
    throw new BrowserError(
      `Failed to retrieve captured events: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Mark the page as ready (for custom ready detection).
 * Useful for SPAs that need time to fully hydrate.
 */
export async function markPageReady(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      (window as any).__dl_ready = true;
    });
    logger.debug('Page marked as ready');
  } catch (error) {
    logger.warn('Failed to mark page as ready', { error });
  }
}

/**
 * Wait for a minimum number of events to be captured.
 * Useful when you know a page fires multiple events on load.
 */
export async function waitForEvents(page: Page, minEvents: number = 1, timeoutMs: number = 3000): Promise<number> {
  try {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const eventCount = await page.evaluate(() => {
        return ((window as any).__dl_events || []).length;
      });

      if (eventCount >= minEvents) {
        logger.debug('Minimum events reached', { count: eventCount, required: minEvents });
        return eventCount;
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const finalCount = await page.evaluate(() => {
      return ((window as any).__dl_events || []).length;
    });

    logger.warn('Timeout waiting for events', { finalCount, required: minEvents, timeoutMs });
    return finalCount;
  } catch (error) {
    logger.error('Error while waiting for events', { error });
    return 0;
  }
}

/**
 * Clear captured events (for testing or between audit phases).
 */
export async function clearCapturedEvents(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      (window as any).__dl_events = [];
    });
    logger.debug('Captured events cleared');
  } catch (error) {
    logger.warn('Failed to clear captured events', { error });
  }
}
