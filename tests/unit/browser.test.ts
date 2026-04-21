/**
 * Unit tests for browser layer (launch, hooks, consent)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { launchBrowser, navigateToUrl, closePage, closeBrowser, takeScreenshot } from '../../src/browser/launch';
import { injectDataLayerHooks, getCapturedEvents, waitForEvents, clearCapturedEvents } from '../../src/browser/hooks';
import { handleConsentBanners, isConsentBannerVisible, addConsentSelector } from '../../src/browser/consent';
import { BrowserConfig, ConsentConfig } from '../../src/core/types';
import { Browser, Page } from 'playwright';

describe('Browser Launch Module', () => {
  let browser: Browser;
  let testPageUrl = 'about:blank';

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

  it('should launch browser successfully', async () => {
    expect(browser).toBeDefined();
    expect(browser).not.toBeNull();
  });

  it('should navigate to a page and return a page object', async () => {
    const page = await navigateToUrl(browser, testPageUrl, config);
    expect(page).toBeDefined();
    expect(page).not.toBeNull();
    await closePage(page);
  });

  it('should throw error on invalid URL', async () => {
    const invalidUrl = 'https://invalid-url-that-does-not-exist-xxxxxx.com';
    const page = await navigateToUrl(browser, testPageUrl, config);

    await expect(navigateToUrl(browser, invalidUrl, config)).rejects.toThrow();
    await closePage(page);
  });

  it('should set correct viewport size on page', async () => {
    const page = await navigateToUrl(browser, testPageUrl, config);
    const viewportSize = page.viewportSize();

    expect(viewportSize).toEqual({
      width: config.viewport.width,
      height: config.viewport.height,
    });

    await closePage(page);
  });

  it('should close page without errors', async () => {
    const page = await navigateToUrl(browser, testPageUrl, config);
    await expect(closePage(page)).resolves.not.toThrow();
  });

  it('should take screenshot of blank page', async () => {
    const page = await navigateToUrl(browser, testPageUrl, config);
    const screenshot = await takeScreenshot(page, 'test-screenshot.png');

    expect(screenshot).toBeDefined();
    expect(Buffer.isBuffer(screenshot)).toBe(true);
    expect(screenshot.length).toBeGreaterThan(0);

    await closePage(page);
  });
});

describe('Browser Hooks Module', () => {
  let browser: Browser;
  let page: Page;

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
    if (page) {
      await closePage(page);
    }
    await closeBrowser(browser);
  });

  it('should inject dataLayer hooks without errors', async () => {
    page = await navigateToUrl(browser, 'about:blank', config);
    await expect(injectDataLayerHooks(page)).resolves.not.toThrow();
  });

  it('should create __dl_events array on window', async () => {
    const hasEvents = await page.evaluate(() => {
      return Array.isArray((window as any).__dl_events);
    });

    expect(hasEvents).toBe(true);
  });

  it('should capture dataLayer.push calls', async () => {
    // Create a page with sample dataLayer push
    const newPage = await navigateToUrl(browser, 'about:blank', config);
    await injectDataLayerHooks(newPage);

    // Push an event
    await newPage.evaluate(() => {
      (window as any).dataLayer.push({
        event: 'test_event',
        param1: 'value1',
      });
    });

    // Retrieve captured events
    const events = await getCapturedEvents(newPage);

    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('test_event');
    expect(events[0].payload.param1).toBe('value1');
    expect(events[0].timestamp).toBeDefined();
    expect(events[0].url).toBeDefined();

    await closePage(newPage);
  });

  it('should preserve multiple event pushes in order', async () => {
    const newPage = await navigateToUrl(browser, 'about:blank', config);
    await injectDataLayerHooks(newPage);

    // Push multiple events
    await newPage.evaluate(() => {
      (window as any).dataLayer.push({ event: 'event1' });
      (window as any).dataLayer.push({ event: 'event2' });
      (window as any).dataLayer.push({ event: 'event3' });
    });

    const events = await getCapturedEvents(newPage);

    expect(events).toHaveLength(3);
    expect(events[0].event).toBe('event1');
    expect(events[1].event).toBe('event2');
    expect(events[2].event).toBe('event3');

    await closePage(newPage);
  });

  it('should wait for minimum events to be captured', async () => {
    const newPage = await navigateToUrl(browser, 'about:blank', config);
    await injectDataLayerHooks(newPage);

    // Push events with delay
    await newPage.evaluate(async () => {
      (window as any).dataLayer.push({ event: 'event1' });
      await new Promise(resolve => setTimeout(resolve, 100));
      (window as any).dataLayer.push({ event: 'event2' });
    });

    const count = await waitForEvents(newPage, 2, 3000);
    expect(count).toBeGreaterThanOrEqual(2);

    await closePage(newPage);
  });

  it('should clear captured events', async () => {
    const newPage = await navigateToUrl(browser, 'about:blank', config);
    await injectDataLayerHooks(newPage);

    // Push an event
    await newPage.evaluate(() => {
      (window as any).dataLayer.push({ event: 'test_event' });
    });

    let events = await getCapturedEvents(newPage);
    expect(events.length).toBeGreaterThan(0);

    // Clear events
    await clearCapturedEvents(newPage);

    events = await getCapturedEvents(newPage);
    expect(events).toHaveLength(0);

    await closePage(newPage);
  });
});

describe('Consent Module', () => {
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

  it('should handle empty consent config gracefully', async () => {
    const page = await navigateToUrl(browser, 'about:blank', config);
    const consentConfig: ConsentConfig = { banners: [] };

    const result = await handleConsentBanners(page, consentConfig);
    expect(result).toBe(false);

    await closePage(page);
  });

  it('should return false if banner not found', async () => {
    const page = await navigateToUrl(browser, 'about:blank', config);
    const consentConfig: ConsentConfig = {
      banners: [{ selector: '.non-existent-banner', priority: 1 }],
    };

    const result = await handleConsentBanners(page, consentConfig);
    expect(result).toBe(false);

    await closePage(page);
  });

  it('should add consent selector to config', async () => {
    const consentConfig: ConsentConfig = { banners: [] };

    addConsentSelector(consentConfig, '.test-banner', 1);

    expect(consentConfig.banners).toHaveLength(1);
    expect(consentConfig.banners[0].selector).toBe('.test-banner');
    expect(consentConfig.banners[0].priority).toBe(1);
  });

  it('should detect consent banner visibility', async () => {
    const page = await navigateToUrl(browser, 'about:blank', config);

    // No banner on blank page
    const consentConfig: ConsentConfig = {
      banners: [{ selector: '.non-existent', priority: 1 }],
    };

    const isVisible = await isConsentBannerVisible(page, consentConfig);
    expect(isVisible).toBe(false);

    await closePage(page);
  });
});

describe('Browser Layer Error Handling', () => {
  let browser: Browser;

  const config: BrowserConfig = {
    headless: true,
    timeout: 3000, // Short timeout for error testing
    userAgent: 'Test User Agent',
    viewport: { width: 1280, height: 720 },
  };

  beforeAll(async () => {
    browser = await launchBrowser(config);
  });

  afterAll(async () => {
    await closeBrowser(browser);
  });

  it('should handle navigation timeout gracefully', async () => {
    // Create a very short timeout
    const shortConfig = { ...config, timeout: 100 };

    await expect(navigateToUrl(browser, 'https://example.com', shortConfig)).rejects.toThrow();
  });

  it('should handle injecting hooks to closed page', async () => {
    const page = await navigateToUrl(browser, 'about:blank', config);
    await closePage(page);

    // Trying to inject hooks to closed page should handle gracefully
    await expect(injectDataLayerHooks(page)).rejects.toThrow();
  });
});
