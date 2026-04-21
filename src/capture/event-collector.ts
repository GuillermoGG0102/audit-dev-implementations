/**
 * Event collection orchestration.
 * Retrieves and structures captured events from the page.
 */

import { Page } from 'playwright';
import logger from '../core/logger.js';
import { BrowserError } from '../core/errors.js';
import { RawDataLayerEvent } from '../core/types.js';
import { capturePageContext, captureElementContext } from './dom-snapshot.js';

/**
 * Collect all captured events and enrich with DOM context.
 * Events are already captured by hooks injected in launch.ts.
 */
export async function collectCapturedEvents(page: Page): Promise<RawDataLayerEvent[]> {
  try {
    logger.debug('Collecting captured events from page');

    // Get all raw events captured during page load/interactions
    const rawEvents = await page.evaluate(() => {
      return (window as any).__dl_events || [];
    });

    logger.debug('Retrieved raw events', { count: rawEvents.length });

    // Enrich events with additional context
    const enrichedEvents: RawDataLayerEvent[] = [];

    for (const event of rawEvents) {
      try {
        const pageContext = await capturePageContext(page);

        // Try to find the element that triggered this event (if not a page_view)
        let triggeringElement = null;
        if (event.event !== 'page_view') {
          // Look for common element identifiers in the event payload
          const elementHint = event.payload?.element_id || event.payload?.element_class || event.payload?.button_text;

          if (elementHint) {
            triggeringElement = await captureElementContext(page, elementHint).catch(() => null);
          }
        }

        const enrichedEvent: RawDataLayerEvent = {
          event: event.event,
          payload: event.payload || {},
          timestamp: event.timestamp,
          url: event.url || pageContext.pageUrl,
          triggeredBy: 'pageLoad', // Default; can be overridden by interaction layer
          domContext: {
            pageTitle: pageContext.pageTitle,
            canonicalURL: pageContext.pageUrl,
            elementSelector: triggeringElement?.selector,
            elementAttributes: triggeringElement
              ? {
                  tagName: triggeringElement.tagName,
                  className: triggeringElement.className,
                  id: triggeringElement.id,
                  text: triggeringElement.text,
                  href: triggeringElement.href || '',
                  ariaLabel: triggeringElement.ariaLabel || '',
                }
              : undefined,
          },
        };

        enrichedEvents.push(enrichedEvent);
      } catch (error) {
        logger.warn('Failed to enrich event, including raw version', { error, event });
        // Include the raw event even if enrichment failed
        enrichedEvents.push({
          event: event.event,
          payload: event.payload || {},
          timestamp: event.timestamp,
          url: event.url,
          triggeredBy: 'pageLoad',
        });
      }
    }

    logger.debug('Events collected and enriched', { count: enrichedEvents.length });
    return enrichedEvents;
  } catch (error) {
    logger.error('Failed to collect captured events', { error });
    throw new BrowserError(
      `Failed to collect captured events: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get the count of currently captured events.
 * Useful for waiting or verification.
 */
export async function getCapturedEventCount(page: Page): Promise<number> {
  try {
    const count = await page.evaluate(() => {
      return ((window as any).__dl_events || []).length;
    });

    return count;
  } catch (error) {
    logger.warn('Failed to get captured event count', { error });
    return 0;
  }
}

/**
 * Wait for events to be captured with optional minimum count.
 * Returns when minEvents are captured or timeout is reached.
 */
export async function waitForCapturedEvents(
  page: Page,
  minEvents: number = 1,
  timeoutMs: number = 5000,
): Promise<number> {
  try {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const count = await getCapturedEventCount(page);

      if (count >= minEvents) {
        logger.debug('Minimum events reached', { count, required: minEvents });
        return count;
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const finalCount = await getCapturedEventCount(page);
    logger.warn('Timeout waiting for events', { finalCount, required: minEvents, timeoutMs });
    return finalCount;
  } catch (error) {
    logger.error('Error waiting for captured events', { error });
    return 0;
  }
}

/**
 * Clear all captured events from the page.
 * Useful for isolating audit phases or interactions.
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
