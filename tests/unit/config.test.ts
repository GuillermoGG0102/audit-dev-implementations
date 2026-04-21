/**
 * Unit tests for configuration loading and CLI
 */

import { describe, it, expect } from 'vitest';
import { getDefaultConfig, loadAuditConfig } from '../../src/core/config.js';
import { AuditConfig } from '../../src/core/types.js';

describe('Configuration Module', () => {
  it('should provide default configuration', () => {
    const config = getDefaultConfig();

    expect(config).toBeDefined();
    expect(config.browser).toBeDefined();
    expect(config.browser.headless).toBe(true);
    expect(config.browser.timeout).toBe(30000);
    expect(config.browser.viewport).toEqual({ width: 1280, height: 720 });
  });

  it('should have valid browser config defaults', () => {
    const config = getDefaultConfig();

    expect(config.browser.timeout).toBeGreaterThan(0);
    expect(config.browser.viewport.width).toBeGreaterThan(0);
    expect(config.browser.viewport.height).toBeGreaterThan(0);
  });

  it('should have valid crawl config defaults', () => {
    const config = getDefaultConfig();

    expect(config.crawl.depth).toBeGreaterThanOrEqual(0);
    expect(config.crawl.maxPages).toBeGreaterThan(0);
    expect(Array.isArray(config.crawl.includePatterns)).toBe(true);
    expect(Array.isArray(config.crawl.excludePatterns)).toBe(true);
  });

  it('should have valid capture config defaults', () => {
    const config = getDefaultConfig();

    expect(config.capture.events).toBe(true);
    expect(config.capture.screenshots).toBe(true);
    expect(typeof config.capture.domSnapshot).toBe('boolean');
  });

  it('should have blocked interactions list', () => {
    const config = getDefaultConfig();

    expect(config.interactions.blocked.length).toBeGreaterThan(0);
    expect(config.interactions.blocked).toContain('checkout');
    expect(config.interactions.blocked).toContain('logout');
  });

  it('should load config with overrides', async () => {
    const overrides: Partial<AuditConfig> = {
      browser: {
        headless: false,
        timeout: 60000,
        userAgent: 'Custom Agent',
        viewport: { width: 1920, height: 1080 },
      },
    };

    const config = await loadAuditConfig('', overrides);

    expect(config.browser.headless).toBe(false);
    expect(config.browser.timeout).toBe(60000);
    expect(config.browser.userAgent).toBe('Custom Agent');
    expect(config.browser.viewport.width).toBe(1920);
  });

  it('should validate and fix invalid config values', async () => {
    const overrides: Partial<AuditConfig> = {
      browser: {
        timeout: 100, // Too low
        headless: true,
        userAgent: 'Test',
        viewport: { width: 100, height: 100 }, // Too small
      },
    };

    const config = await loadAuditConfig('', overrides);

    // Should be adjusted/validated
    expect(config.browser.timeout).toBeGreaterThanOrEqual(1000);
    expect(config.browser.viewport.width).toBeGreaterThanOrEqual(320);
  });

  it('should apply environment variable overrides', async () => {
    // Set test environment variables
    process.env.HEADLESS = 'false';
    process.env.BROWSER_TIMEOUT = '45000';
    process.env.VIEWPORT_WIDTH = '1600';
    process.env.VIEWPORT_HEIGHT = '900';

    try {
      const config = await loadAuditConfig('');

      expect(config.browser.headless).toBe(false);
      expect(config.browser.timeout).toBe(45000);
      expect(config.browser.viewport.width).toBe(1600);
      expect(config.browser.viewport.height).toBe(900);
    } finally {
      // Clean up
      delete process.env.HEADLESS;
      delete process.env.BROWSER_TIMEOUT;
      delete process.env.VIEWPORT_WIDTH;
      delete process.env.VIEWPORT_HEIGHT;
    }
  });

  it('should handle missing config file gracefully', async () => {
    const config = await loadAuditConfig('/non/existent/path.yaml');

    // Should return valid defaults
    expect(config.browser).toBeDefined();
    expect(config.crawl).toBeDefined();
  });

  it('should validate crawl depth', async () => {
    const overrides: Partial<AuditConfig> = {
      crawl: {
        depth: -1,
        maxPages: 5,
        followExternalLinks: false,
        includePatterns: [],
        excludePatterns: [],
      },
    };

    const config = await loadAuditConfig('', overrides);

    // Should be fixed
    expect(config.crawl.depth).toBeGreaterThanOrEqual(0);
  });
});
