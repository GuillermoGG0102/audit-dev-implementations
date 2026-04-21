/**
 * Evidence collection and management.
 * Captures screenshots, raw payloads, and other audit evidence.
 */

import { Page } from 'playwright';
import logger from '../core/logger.js';
import { Evidence, RawDataLayerEvent } from '../core/types.js';
import { takeScreenshot } from '../browser/launch.js';

/**
 * Capture screenshot of current page state as evidence.
 */
export async function captureScreenshotEvidence(
  page: Page,
  timestamp: number,
  label: string = 'default',
): Promise<Evidence | null> {
  try {
    logger.debug('Capturing screenshot evidence', { label, timestamp });

    const screenshot = await takeScreenshot(page, `evidence-${label}-${timestamp}.png`);

    const evidence: Evidence = {
      type: 'screenshot',
      data: screenshot,
      timestamp,
    };

    logger.debug('Screenshot evidence captured', { label, size: screenshot.length });
    return evidence;
  } catch (error) {
    logger.warn('Failed to capture screenshot evidence', { label, error });
    return null;
  }
}

/**
 * Create evidence from raw event payload.
 */
export function createPayloadEvidence(event: RawDataLayerEvent): Evidence {
  const evidence: Evidence = {
    type: 'rawPayload',
    data: JSON.stringify(event, null, 2),
    timestamp: event.timestamp,
  };

  return evidence;
}

/**
 * Create evidence from DOM snapshot.
 */
export function createDOMSnapshotEvidence(
  timestamp: number,
  domContext: Record<string, unknown>,
): Evidence {
  const evidence: Evidence = {
    type: 'domSnapshot',
    data: JSON.stringify(domContext, null, 2),
    timestamp,
  };

  return evidence;
}

/**
 * Collect all evidence for an event.
 * Combines screenshot, raw payload, and DOM snapshot.
 */
export async function collectEventEvidence(
  page: Page,
  event: RawDataLayerEvent,
  captureScreenshot: boolean = true,
  captureDOMSnapshot: boolean = true,
): Promise<Evidence[]> {
  const evidence: Evidence[] = [];

  try {
    // Always capture raw payload
    const payloadEvidence = createPayloadEvidence(event);
    evidence.push(payloadEvidence);

    // Optionally capture screenshot
    if (captureScreenshot) {
      const screenshot = await captureScreenshotEvidence(page, event.timestamp, event.event);
      if (screenshot) {
        evidence.push(screenshot);
      }
    }

    // Optionally capture DOM snapshot
    if (captureDOMSnapshot && event.domContext) {
      const domEvidence = createDOMSnapshotEvidence(event.timestamp, event.domContext as unknown as Record<string, unknown>);
      evidence.push(domEvidence);
    }

    logger.debug('Event evidence collected', { event: event.event, evidenceCount: evidence.length });
    return evidence;
  } catch (error) {
    logger.warn('Failed to collect event evidence', { event: event.event, error });
    // Return at least the payload evidence
    return evidence.length > 0 ? evidence : [createPayloadEvidence(event)];
  }
}

/**
 * Take screenshots for page load event.
 */
export async function capturePageLoadEvidence(
  page: Page,
  timestamp: number,
): Promise<Evidence[]> {
  const evidence: Evidence[] = [];

  try {
    // Screenshot of loaded page
    const screenshot = await captureScreenshotEvidence(page, timestamp, 'page-load');
    if (screenshot) {
      evidence.push(screenshot);
    }

    // Capture page metadata
    const metadata = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        readyState: document.readyState,
      };
    });

    const metadataEvidence = createDOMSnapshotEvidence(timestamp, metadata as Record<string, unknown>);
    evidence.push(metadataEvidence);

    logger.debug('Page load evidence captured', { evidenceCount: evidence.length });
    return evidence;
  } catch (error) {
    logger.warn('Failed to capture page load evidence', { error });
    return evidence;
  }
}

/**
 * Create evidence manifest for audit run.
 */
export interface EvidenceManifest {
  totalEvidence: number;
  screenshots: number;
  payloads: number;
  domSnapshots: number;
  generatedAt: Date;
  totalSize: number;
}

export function createEvidenceManifest(evidence: Evidence[]): EvidenceManifest {
  const screenshots = evidence.filter(e => e.type === 'screenshot').length;
  const payloads = evidence.filter(e => e.type === 'rawPayload').length;
  const domSnapshots = evidence.filter(e => e.type === 'domSnapshot').length;

  const totalSize = evidence.reduce((sum, e) => {
    if (Buffer.isBuffer(e.data)) {
      return sum + e.data.length;
    }
    return sum + (typeof e.data === 'string' ? e.data.length : 0);
  }, 0);

  return {
    totalEvidence: evidence.length,
    screenshots,
    payloads,
    domSnapshots,
    generatedAt: new Date(),
    totalSize,
  };
}
