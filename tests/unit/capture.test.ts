/**
 * Unit tests for capture layer (event collection, DOM context, observation)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { launchBrowser, navigateToUrl, closePage, closeBrowser } from '../../src/browser/launch.js';
import { injectDataLayerHooks } from '../../src/browser/hooks.js';
import {
  collectCapturedEvents,
  getCapturedEventCount,
  waitForCapturedEvents,
  clearCapturedEvents,
} from '../../src/capture/event-collector.js';
import {
  filterCapturedEvents,
  getFirstEvent,
  getEventsByName,
  hasEvent,
  getEventStatistics,
  exportEventsAsJson,
} from '../../src/capture/datalayer-observer.js';
import { capturePageContext, captureElementContext } from '../../src/capture/dom-snapshot.js';
import { BrowserConfig } from '../../src/core/types.js';
import { Browser, Page } from 'playwright';

describe('Event Collector Module', () => {
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

  it('should collect captured events with enrichment', async () => {
    page = await navigateToUrl(browser, 'about:blank', config);
    await injectDataLayerHooks(page);

    // Push a test event
    await page.evaluate(() => {
      (window as any).dataLayer.push({
        event: 'test_event',
        param1: 'value1',
        param2: 123,
      });
    });

    const collected = await collectCapturedEvents(page);

    expect(collected.length).toBeGreaterThan(0);
    expect(collected[0].event).toBe('test_event');
    expect(collected[0].payload.param1).toBe('value1');
    expect(collected[0].domContext).toBeDefined();
    expect(collected[0].domContext?.pageTitle).toBeDefined();
    expect(collected[0].domContext?.canonicalURL).toBeDefined();
  });

  it('should get captured event count', async () => {
    const newPage = await navigateToUrl(browser, 'about:blank', config);
    await injectDataLayerHooks(newPage);

    const countBefore = await getCapturedEventCount(newPage);
    expect(countBefore).toBe(0);

    await newPage.evaluate(() => {
      (window as any).dataLayer.push({ event: 'event1' });
      (window as any).dataLayer.push({ event: 'event2' });
    });

    const countAfter = await getCapturedEventCount(newPage);
    expect(countAfter).toBeGreaterThanOrEqual(2);

    await closePage(newPage);
  });

  it('should wait for minimum events', async () => {
    const newPage = await navigateToUrl(browser, 'about:blank', config);
    await injectDataLayerHooks(newPage);

    const count = await waitForCapturedEvents(newPage, 1, 3000);
    expect(count).toBeGreaterThanOrEqual(1);

    await closePage(newPage);
  });

  it('should clear captured events', async () => {
    const newPage = await navigateToUrl(browser, 'about:blank', config);
    await injectDataLayerHooks(newPage);

    // Add events
    await newPage.evaluate(() => {
      (window as any).dataLayer.push({ event: 'test1' });
      (window as any).dataLayer.push({ event: 'test2' });
    });

    let count = await getCapturedEventCount(newPage);
    expect(count).toBeGreaterThan(0);

    // Clear events
    await clearCapturedEvents(newPage);

    count = await getCapturedEventCount(newPage);
    expect(count).toBe(0);

    await closePage(newPage);
  });
});

describe('DataLayer Observer Module', () => {
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

  it('should filter events by name', async () => {
    page = await navigateToUrl(browser, 'about:blank', config);
    await injectDataLayerHooks(page);

    // Push multiple events
    await page.evaluate(() => {
      (window as any).dataLayer.push({ event: 'page_view', param1: 'value1' });
      (window as any).dataLayer.push({ event: 'click', param2: 'value2' });
      (window as any).dataLayer.push({ event: 'page_view', param3: 'value3' });
    });

    const filtered = await filterCapturedEvents(page, { eventName: 'page_view' });

    expect(filtered.length).toBeGreaterThanOrEqual(2);
    expect(filtered.every((e: any) => e.event === 'page_view')).toBe(true);
  });

  it('should get first event of type', async () => {
    const newPage = await navigateToUrl(browser, 'about:blank', config);
    await injectDataLayerHooks(newPage);

    await newPage.evaluate(() => {
      (window as any).dataLayer.push({ event: 'event1', order: 1 });
      (window as any).dataLayer.push({ event: 'event1', order: 2 });
    });

    const first = await getFirstEvent(newPage, 'event1');

    expect(first).not.toBeNull();
    expect(first.event).toBe('event1');
    expect(first.payload.order).toBe(1);

    await closePage(newPage);
  });

  it('should get all events of specific name', async () => {
    const newPage = await navigateToUrl(browser, 'about:blank', config);
    await injectDataLayerHooks(newPage);

    await newPage.evaluate(() => {
      (window as any).dataLayer.push({ event: 'click' });
      (window as any).dataLayer.push({ event: 'view' });
      (window as any).dataLayer.push({ event: 'click' });
    });

    const clicks = await getEventsByName(newPage, 'click');

    expect(clicks.length).toBeGreaterThanOrEqual(2);
    expect(clicks.every((e: any) => e.event === 'click')).toBe(true);

    await closePage(newPage);
  });

  it('should detect event existence', async () => {
    const newPage = await navigateToUrl(browser, 'about:blank', config);
    await injectDataLayerHooks(newPage);

    await newPage.evaluate(() => {
      (window as any).dataLayer.push({ event: 'page_view' });
    });

    const hasPageView = await hasEvent(newPage, 'page_view');
    const hasClick = await hasEvent(newPage, 'click');

    expect(hasPageView).toBe(true);
    expect(hasClick).toBe(false);

    await closePage(newPage);
  });

  it('should get event statistics', async () => {
    const newPage = await navigateToUrl(browser, 'about:blank', config);
    await injectDataLayerHooks(newPage);

    await newPage.evaluate(() => {
      (window as any).dataLayer.push({ event: 'page_view' });
      (window as any).dataLayer.push({ event: 'click' });
      (window as any).dataLayer.push({ event: 'page_view' });
    });

    const stats = await getEventStatistics(newPage);

    expect(stats.totalEvents).toBeGreaterThanOrEqual(3);
    expect(stats.uniqueEventNames.length).toBeGreaterThanOrEqual(2);
    expect(stats.eventCounts['page_view']).toBeGreaterThanOrEqual(2);
    expect(stats.eventCounts['click']).toBeGreaterThanOrEqual(1);
    expect(stats.totalTimespan).toBeGreaterThanOrEqual(0);

    await closePage(newPage);
  });

  it('should export events as JSON', async () => {
    const newPage = await navigateToUrl(browser, 'about:blank', config);
    await injectDataLayerHooks(newPage);

    await newPage.evaluate(() => {
      (window as any).dataLayer.push({ event: 'test_event', data: 'test_data' });
    });

    const json = await exportEventsAsJson(newPage);

    expect(json).toBeDefined();
    expect(typeof json).toBe('string');

    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);

    await closePage(newPage);
  });
});

describe('DOM Snapshot Module', () => {
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

  it('should capture page context', async () => {
    const page = await navigateToUrl(browser, 'about:blank', config);

    const context = await capturePageContext(page);

    expect(context.pageTitle).toBeDefined();
    expect(context.pageUrl).toBeDefined();
    expect(context.viewportSize).not.toBeNull();
    expect(context.viewportSize?.width).toBeGreaterThan(0);
    expect(context.viewportSize?.height).toBeGreaterThan(0);

    await closePage(page);
  });

  it('should capture element context', async () => {
    const page = await navigateToUrl(browser, 'about:blank', config);

    // Create a test element
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.id = 'test-element';
      div.className = 'test-class';
      div.textContent = 'Test Content';
      document.body.appendChild(div);
    });

    const context = await captureElementContext(page, '#test-element');

    expect(context).not.toBeNull();
    expect(context?.id).toBe('test-element');
    expect(context?.className).toBe('test-class');
    expect(context?.tagName).toBe('div');
    expect(context?.text).toContain('Test Content');

    await closePage(page);
  });

  it('should return null for non-existent element', async () => {
    const page = await navigateToUrl(browser, 'about:blank', config);

    const context = await captureElementContext(page, '#non-existent-element');

    expect(context).toBeNull();

    await closePage(page);
  });
});
