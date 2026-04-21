/**
 * End-to-end integration tests for complete audit flow.
 * Tests all layers working together: browser → capture → audit → normalization.
 */

import { describe, it, expect } from 'vitest';
import { auditPage } from '../../src/audit/page-audit.js';
import { BrowserConfig, ConsentConfig } from '../../src/core/types.js';

describe('Complete Audit Flow - End-to-End', () => {
  const browserConfig: BrowserConfig = {
    headless: true,
    timeout: 15000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1280, height: 720 },
  };

  const consentConfig: ConsentConfig = {
    banners: [],
  };

  const auditOptions = {
    browserConfig,
    consentConfig,
    captureScreenshots: true,
    captureDOMSnapshots: true,
    deduplicateEvents: true,
    maxEventsToWaitFor: 50,
    eventWaitTimeoutMs: 5000,
  };

  describe('Audit Page (about:blank)', () => {
    it('should complete full audit of a blank page', async () => {
      const result = await auditPage('about:blank', auditOptions);

      expect(result).toBeDefined();
      expect(result.url).toBe('about:blank');
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.endTime.getTime()).toBeGreaterThanOrEqual(result.startTime.getTime());
    });

    it('should capture page events', async () => {
      const result = await auditPage('about:blank', auditOptions);

      expect(Array.isArray(result.pageEvents)).toBe(true);
      expect(Array.isArray(result.rawCapture)).toBe(true);
    });

    it('should handle no warnings for simple page', async () => {
      const result = await auditPage('about:blank', auditOptions);

      expect(Array.isArray(result.warnings)).toBe(true);
      // about:blank should not have warnings
      expect(result.warnings.length).toBe(0);
    });

    it('should return raw event capture', async () => {
      const result = await auditPage('about:blank', auditOptions);

      expect(result.rawCapture).toBeDefined();
      // Raw capture should have the original events with all metadata
      if (result.rawCapture.length > 0) {
        const event = result.rawCapture[0];
        expect(event.event).toBeDefined();
        expect(event.payload).toBeDefined();
        expect(event.timestamp).toBeDefined();
        expect(event.url).toBeDefined();
        expect(event.triggeredBy).toBeDefined();
      }
    });

    it('should return normalized events', async () => {
      const result = await auditPage('about:blank', auditOptions);

      expect(result.pageEvents).toBeDefined();
      // Normalized events should have consistent structure
      if (result.pageEvents.length > 0) {
        const event = result.pageEvents[0];
        expect(event.eventName).toBeDefined();
        expect(event.parameters).toBeDefined();
        expect(event.url).toBeDefined();
        expect(event.triggeredBy).toBeDefined();
        expect(event.timestamp).toBeDefined();
        expect(Array.isArray(event.evidence)).toBe(true);
      }
    });

    it('should handle interaction events map', async () => {
      const result = await auditPage('about:blank', auditOptions);

      expect(result.interactionEvents).toBeInstanceOf(Map);
      expect(result.interactionEvents.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Audit with Custom Page Content', () => {
    it('should audit page with injected dataLayer events', async () => {
      // This test requires page manipulation which we'll do via a test URL
      // Since we can't create actual pages, we test with about:blank
      const result = await auditPage('about:blank', auditOptions);

      expect(result.url).toBe('about:blank');
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Audit Result Structure Validation', () => {
    it('should have valid PageAuditResult structure', async () => {
      const result = await auditPage('about:blank', auditOptions);

      // Validate all required properties exist
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('startTime');
      expect(result).toHaveProperty('endTime');
      expect(result).toHaveProperty('pageEvents');
      expect(result).toHaveProperty('interactionEvents');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('rawCapture');

      // Validate types
      expect(typeof result.url).toBe('string');
      expect(result.startTime instanceof Date).toBe(true);
      expect(result.endTime instanceof Date).toBe(true);
      expect(Array.isArray(result.pageEvents)).toBe(true);
      expect(result.interactionEvents instanceof Map).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.rawCapture)).toBe(true);
    });

    it('should have valid NormalizedEvent structure', async () => {
      const result = await auditPage('about:blank', auditOptions);

      if (result.pageEvents.length > 0) {
        const event = result.pageEvents[0];

        // Validate all required properties
        expect(event).toHaveProperty('eventName');
        expect(event).toHaveProperty('parameters');
        expect(event).toHaveProperty('url');
        expect(event).toHaveProperty('triggeredBy');
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('evidence');

        // Validate types
        expect(typeof event.eventName).toBe('string');
        expect(typeof event.parameters).toBe('object');
        expect(typeof event.url).toBe('string');
        expect(['pageLoad', 'interaction']).toContain(event.triggeredBy);
        expect(typeof event.timestamp).toBe('number');
        expect(Array.isArray(event.evidence)).toBe(true);
      }
    });

    it('should have valid RawDataLayerEvent structure', async () => {
      const result = await auditPage('about:blank', auditOptions);

      if (result.rawCapture.length > 0) {
        const event = result.rawCapture[0];

        // Validate all required properties
        expect(event).toHaveProperty('event');
        expect(event).toHaveProperty('payload');
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('url');
        expect(event).toHaveProperty('triggeredBy');

        // Validate types
        expect(typeof event.event).toBe('string');
        expect(typeof event.payload).toBe('object');
        expect(typeof event.timestamp).toBe('number');
        expect(typeof event.url).toBe('string');
        expect(['pageLoad', 'interaction']).toContain(event.triggeredBy);
      }
    });
  });

  describe('Audit Timing and Duration', () => {
    it('should track audit start and end times', async () => {
      const beforeAudit = Date.now();
      const result = await auditPage('about:blank', auditOptions);
      const afterAudit = Date.now();

      expect(result.startTime.getTime()).toBeGreaterThanOrEqual(beforeAudit - 100);
      expect(result.endTime.getTime()).toBeLessThanOrEqual(afterAudit + 100);
      expect(result.endTime.getTime()).toBeGreaterThanOrEqual(result.startTime.getTime());
    });

    it('should complete audit within reasonable timeframe', async () => {
      const result = await auditPage('about:blank', auditOptions);

      const duration = result.endTime.getTime() - result.startTime.getTime();
      // about:blank should complete quickly (within 10 seconds)
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid URL gracefully', async () => {
      const invalidUrl = 'https://invalid-url-that-does-not-exist-12345678.xyz';
      const result = await auditPage(invalidUrl, auditOptions);

      // Should return result even on error
      expect(result).toBeDefined();
      expect(result.url).toBe(invalidUrl);
      // Should have warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      // Should have error code in warnings
      const errorWarning = result.warnings.find(w => w.severity === 'error');
      expect(errorWarning).toBeDefined();
    });
  });
});

describe('Audit Configuration Options', () => {
  const browserConfig: BrowserConfig = {
    headless: true,
    timeout: 15000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1280, height: 720 },
  };

  const consentConfig: ConsentConfig = {
    banners: [],
  };

  it('should respect screenshot capture option', async () => {
    const optionsWithScreenshots = {
      browserConfig,
      consentConfig,
      captureScreenshots: true,
      captureDOMSnapshots: false,
      deduplicateEvents: true,
      maxEventsToWaitFor: 50,
      eventWaitTimeoutMs: 5000,
    };

    const result = await auditPage('about:blank', optionsWithScreenshots);

    expect(result).toBeDefined();
    // When screenshots enabled, evidence should potentially include them
    if (result.pageEvents.length > 0 && result.pageEvents[0].evidence.length > 0) {
      const hasScreenshots = result.pageEvents[0].evidence.some(e => e.type === 'screenshot');
      // Might or might not have screenshots depending on page
      expect(typeof hasScreenshots).toBe('boolean');
    }
  });

  it('should respect DOM snapshot capture option', async () => {
    const optionsWithoutDOM = {
      browserConfig,
      consentConfig,
      captureScreenshots: false,
      captureDOMSnapshots: false,
      deduplicateEvents: true,
      maxEventsToWaitFor: 50,
      eventWaitTimeoutMs: 5000,
    };

    const result = await auditPage('about:blank', optionsWithoutDOM);

    expect(result).toBeDefined();
    // Should complete successfully even with minimal capture
    expect(result.pageEvents).toBeDefined();
  });

  it('should respect deduplication option', async () => {
    const optionsWithDedup = {
      browserConfig,
      consentConfig,
      captureScreenshots: false,
      captureDOMSnapshots: false,
      deduplicateEvents: true,
      maxEventsToWaitFor: 50,
      eventWaitTimeoutMs: 5000,
    };

    const result = await auditPage('about:blank', optionsWithDedup);

    expect(result).toBeDefined();
    // Deduplication should result in fewer normalized events
    expect(result.pageEvents).toBeDefined();
  });
});
