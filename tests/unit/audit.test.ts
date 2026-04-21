/**
 * Unit tests for audit layer (normalization, evidence, page audit)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { launchBrowser, navigateToUrl, closePage, closeBrowser } from '../../src/browser/launch.js';
import { injectDataLayerHooks } from '../../src/browser/hooks.js';
import {
  normalizeRawEvents,
  validateEventParameters,
  validateParameterType,
  sanitizeParameters,
  deduplicateEvents,
  groupEventsByUrl,
  groupEventsByName,
  getEventStatistics,
} from '../../src/audit/normalizer.js';
import { createPayloadEvidence, createDOMSnapshotEvidence, createEvidenceManifest } from '../../src/audit/evidence.js';
import { BrowserConfig, RawDataLayerEvent, NormalizedEvent } from '../../src/core/types.js';
import { Browser } from 'playwright';

describe('Event Normalizer Module', () => {
  const mockRawEvent: RawDataLayerEvent = {
    event: 'page_view',
    payload: {
      page_name: 'Home',
      page_category: 'Landing',
      page_type: 'home',
      content_group: 'Main',
      page_author: 'admin',
    },
    timestamp: 1000,
    url: 'https://example.com',
    triggeredBy: 'pageLoad',
  };

  it('should normalize raw events', () => {
    const raw = [mockRawEvent];
    const normalized = normalizeRawEvents(raw, 'https://example.com');

    expect(normalized).toHaveLength(1);
    expect(normalized[0].eventName).toBe('page_view');
    expect(normalized[0].url).toBe('https://example.com');
    expect(normalized[0].triggeredBy).toBe('pageLoad');
  });

  it('should skip events with missing event name', () => {
    const raw = [{ ...mockRawEvent, event: null }] as any;
    const normalized = normalizeRawEvents(raw, 'https://example.com');

    expect(normalized).toHaveLength(0);
  });

  it('should validate event parameters', () => {
    const params = { page_name: 'Home', page_type: 'home' };
    const missing = validateEventParameters('page_view', params, ['page_name', 'page_type', 'user_id']);

    expect(missing).toEqual(['user_id']);
  });

  it('should validate parameter types', () => {
    expect(validateParameterType('hello', 'string')).toBe(true);
    expect(validateParameterType(123, 'number')).toBe(true);
    expect(validateParameterType(true, 'boolean')).toBe(true);
    expect(validateParameterType([1, 2], 'array')).toBe(true);
    expect(validateParameterType({ a: 1 }, 'object')).toBe(true);

    expect(validateParameterType(123, 'string')).toBe(false);
    expect(validateParameterType('text', 'number')).toBe(false);
  });

  it('should sanitize sensitive parameters', () => {
    const params = {
      name: 'John Doe',
      password: 'secret123',
      api_key: 'key12345',
      email: 'john@example.com',
      valid_param: 'keep_this',
    };

    const sanitized = sanitizeParameters(params);

    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.api_key).toBe('[REDACTED]');
    expect(sanitized.valid_param).toBe('keep_this');
  });

  it('should remove null and undefined values', () => {
    const params = {
      valid: 'value',
      nullValue: null,
      undefinedValue: undefined,
    };

    const sanitized = sanitizeParameters(params);

    expect(sanitized.valid).toBe('value');
    expect(sanitized.nullValue).toBeUndefined();
    expect(sanitized.undefinedValue).toBeUndefined();
  });

  it('should deduplicate events', () => {
    const event1: NormalizedEvent = {
      eventName: 'click',
      parameters: { button: 'submit' },
      url: 'https://example.com',
      triggeredBy: 'interaction',
      timestamp: 1000,
      evidence: [],
    };

    const event2: NormalizedEvent = {
      eventName: 'click',
      parameters: { button: 'submit' },
      url: 'https://example.com',
      triggeredBy: 'interaction',
      timestamp: 1100, // Within 1000ms time window
      evidence: [],
    };

    const event3: NormalizedEvent = {
      eventName: 'click',
      parameters: { button: 'submit' },
      url: 'https://example.com',
      triggeredBy: 'interaction',
      timestamp: 3000, // Outside time window
      evidence: [],
    };

    const deduped = deduplicateEvents([event1, event2, event3]);

    expect(deduped.length).toBe(2); // event1 + event3 (event2 is duplicate of event1)
  });

  it('should group events by URL', () => {
    const events: NormalizedEvent[] = [
      { ...mockRawEvent, url: 'https://example.com/page1', eventName: 'event1' },
      { ...mockRawEvent, url: 'https://example.com/page2', eventName: 'event2' },
      { ...mockRawEvent, url: 'https://example.com/page1', eventName: 'event3' },
    ] as any;

    const grouped = groupEventsByUrl(events);

    expect(grouped.size).toBe(2);
    expect(grouped.get('https://example.com/page1')).toHaveLength(2);
    expect(grouped.get('https://example.com/page2')).toHaveLength(1);
  });

  it('should group events by name', () => {
    const events: NormalizedEvent[] = [
      { ...mockRawEvent, eventName: 'page_view' },
      { ...mockRawEvent, eventName: 'click' },
      { ...mockRawEvent, eventName: 'page_view' },
    ] as any;

    const grouped = groupEventsByName(events);

    expect(grouped.size).toBe(2);
    expect(grouped.get('page_view')).toHaveLength(2);
    expect(grouped.get('click')).toHaveLength(1);
  });

  it('should calculate event statistics', () => {
    const events: NormalizedEvent[] = [
      { ...mockRawEvent, eventName: 'page_view', triggeredBy: 'pageLoad', timestamp: 1000 },
      { ...mockRawEvent, eventName: 'click', triggeredBy: 'interaction', timestamp: 1100 },
      { ...mockRawEvent, eventName: 'page_view', triggeredBy: 'pageLoad', timestamp: 1200 },
    ] as any;

    const stats = getEventStatistics(events);

    expect(stats.totalEvents).toBe(3);
    expect(stats.uniqueEventNames).toContain('page_view');
    expect(stats.uniqueEventNames).toContain('click');
    expect(stats.eventCountByName['page_view']).toBe(2);
    expect(stats.eventCountByName['click']).toBe(1);
    expect(stats.pageLoadEvents).toBe(2);
    expect(stats.interactionEvents).toBe(1);
  });
});

describe('Evidence Module', () => {
  const mockEvent: RawDataLayerEvent = {
    event: 'page_view',
    payload: { page_name: 'Home' },
    timestamp: 1000,
    url: 'https://example.com',
    triggeredBy: 'pageLoad',
  };

  it('should create payload evidence from event', () => {
    const evidence = createPayloadEvidence(mockEvent);

    expect(evidence.type).toBe('rawPayload');
    expect(evidence.timestamp).toBe(1000);
    expect(typeof evidence.data).toBe('string');

    const parsed = JSON.parse(evidence.data as string);
    expect(parsed.event).toBe('page_view');
  });

  it('should create DOM snapshot evidence', () => {
    const domContext = { pageTitle: 'Test Page', url: 'https://example.com' };
    const evidence = createDOMSnapshotEvidence(1000, domContext);

    expect(evidence.type).toBe('domSnapshot');
    expect(evidence.timestamp).toBe(1000);

    const parsed = JSON.parse(evidence.data as string);
    expect(parsed.pageTitle).toBe('Test Page');
  });

  it('should create evidence manifest', () => {
    const payloadEvidence = createPayloadEvidence(mockEvent);
    const domEvidence = createDOMSnapshotEvidence(1000, { title: 'Test' });

    const manifest = createEvidenceManifest([payloadEvidence, domEvidence]);

    expect(manifest.totalEvidence).toBe(2);
    expect(manifest.payloads).toBe(1);
    expect(manifest.domSnapshots).toBe(1);
    expect(manifest.screenshots).toBe(0);
    expect(manifest.totalSize).toBeGreaterThan(0);
  });
});

describe('Page Audit Integration', () => {
  let browser: Browser;

  const config: BrowserConfig = {
    headless: true,
    timeout: 10000,
    userAgent: 'Test User Agent',
    viewport: { width: 1280, height: 720 },
  };

  beforeAll(async () => {
    browser = await launchBrowser(config);
  });

  afterAll(async () => {
    await closeBrowser(browser);
  });

  it('should capture and normalize events from page', async () => {
    const page = await navigateToUrl(browser, 'about:blank', config);
    await injectDataLayerHooks(page);

    // Push some test events
    await page.evaluate(() => {
      (window as any).dataLayer.push({
        event: 'page_view',
        page_name: 'Home',
        page_type: 'home',
      });

      (window as any).dataLayer.push({
        event: 'select_content',
        content_type: 'article',
        content_name: 'Test Article',
      });
    });

    // Collect and normalize
    const { collectCapturedEvents } = await import('../../src/capture/event-collector.js');
    const rawEvents = await collectCapturedEvents(page);

    expect(rawEvents.length).toBeGreaterThan(0);

    const normalized = normalizeRawEvents(rawEvents, 'about:blank');

    expect(normalized.length).toBeGreaterThan(0);
    expect(normalized.some(e => e.eventName === 'page_view')).toBe(true);

    await closePage(page);
  });
});
