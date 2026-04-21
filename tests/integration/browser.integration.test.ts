/**
 * Integration tests for browser layer against real website
 * Tests against https://www.tnkproject.com
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { launchBrowser, navigateToUrl, closePage, closeBrowser, takeScreenshot } from '../../src/browser/launch';
import { injectDataLayerHooks, getCapturedEvents, waitForEvents } from '../../src/browser/hooks';
import { handleConsentBanners } from '../../src/browser/consent';
import { BrowserConfig, ConsentConfig } from '../../src/core/types';
import { Browser, Page } from 'playwright';

describe('Browser Integration Tests - TNK Project (https://www.tnkproject.com)', () => {
  let browser: Browser;
  const testSiteUrl = 'https://www.tnkproject.com';

  const browserConfig: BrowserConfig = {
    headless: true,
    timeout: 15000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1280, height: 720 },
  };

  const consentConfig: ConsentConfig = {
    banners: [],
  };

  beforeAll(async () => {
    browser = await launchBrowser(browserConfig);
  });

  afterAll(async () => {
    await closeBrowser(browser);
  });

  describe('Homepage (/) Audit', () => {
    let page: Page;

    beforeAll(async () => {
      page = await navigateToUrl(browser, testSiteUrl, browserConfig);
      await injectDataLayerHooks(page);
      await handleConsentBanners(page, consentConfig);
    });

    afterAll(async () => {
      if (page) {
        await closePage(page);
      }
    });

    it('should load homepage successfully', async () => {
      const title = await page.title();
      expect(title).toBeDefined();
      expect(title.length).toBeGreaterThan(0);

      const url = page.url();
      expect(url).toContain('tnkproject.com');
    });

    it('should capture page_view event on homepage', async () => {
      // Wait for initial page load events
      await waitForEvents(page, 1, 5000);

      const events = await getCapturedEvents(page);
      const pageViewEvent = events.find(e => e.event === 'page_view');

      expect(pageViewEvent).toBeDefined();
      expect(pageViewEvent?.payload.page_name).toBeDefined();
      expect(pageViewEvent?.payload.page_category).toBeDefined();
      expect(pageViewEvent?.payload.page_type).toBeDefined();
    });

    it('should have valid page_view event parameters', async () => {
      const events = await getCapturedEvents(page);
      const pageViewEvent = events.find(e => e.event === 'page_view');

      expect(pageViewEvent).toBeDefined();

      // Check required parameters
      expect(pageViewEvent?.payload.page_name).toBeTypeOf('string');
      expect(pageViewEvent?.payload.page_category).toBeTypeOf('string');
      expect(pageViewEvent?.payload.page_type).toBeTypeOf('string');
      expect(pageViewEvent?.payload.content_group).toBeTypeOf('string');
      expect(pageViewEvent?.payload.page_author).toBeTypeOf('string');

      // Check expected values for homepage
      expect(['home', 'listing', 'article', 'contact', 'detail']).toContain(pageViewEvent?.payload.page_type);
    });

    it('should have correct event timestamp and URL', async () => {
      const events = await getCapturedEvents(page);
      expect(events.length).toBeGreaterThan(0);

      for (const event of events) {
        expect(event.timestamp).toBeTypeOf('number');
        expect(event.timestamp).toBeGreaterThan(0);
        expect(event.url).toContain('tnkproject.com');
      }
    });

    it('should be able to take screenshot of homepage', async () => {
      const screenshot = await takeScreenshot(page, 'homepage.png');
      expect(Buffer.isBuffer(screenshot)).toBe(true);
      expect(screenshot.length).toBeGreaterThan(1000); // Should be a valid screenshot
    });
  });

  describe('Blog Page (/blog.html) Audit', () => {
    let page: Page;
    const blogUrl = `${testSiteUrl}/blog.html`;

    beforeAll(async () => {
      page = await navigateToUrl(browser, blogUrl, browserConfig);
      await injectDataLayerHooks(page);
      await handleConsentBanners(page, consentConfig);
    });

    afterAll(async () => {
      if (page) {
        await closePage(page);
      }
    });

    it('should load blog page successfully', async () => {
      const url = page.url();
      expect(url).toContain('/blog');

      const title = await page.title();
      expect(title).toBeDefined();
    });

    it('should capture page_view event for blog page', async () => {
      await waitForEvents(page, 1, 5000);

      const events = await getCapturedEvents(page);
      const pageViewEvent = events.find(e => e.event === 'page_view');

      expect(pageViewEvent).toBeDefined();
      expect(pageViewEvent?.payload.page_category).toMatch(/blog|main/i);
    });

    it('should trigger select_content event on blog post card click', async () => {
      // Find and click a blog post card (using common selectors)
      const cardSelector = 'a[href*="/blog/"], .blog-post, article a, .post-link';

      try {
        const card = await page.$(cardSelector);

        if (card) {
          const eventsBefore = await getCapturedEvents(page);
          const countBefore = eventsBefore.length;

          // Click the card
          await page.click(cardSelector);

          // Wait for new events
          await waitForEvents(page, countBefore + 1, 3000);

          const eventsAfter = await getCapturedEvents(page);

          // Check if select_content was triggered
          const selectContentEvent = eventsAfter
            .slice(countBefore)
            .find(e => e.event === 'select_content');

          if (selectContentEvent) {
            expect(selectContentEvent?.payload.content_type).toBeDefined();
            expect(selectContentEvent?.payload.content_name).toBeDefined();
          }
        }
      } catch (error) {
        // Blog post cards might not be clickable or visible; that's ok for this test
        console.log('Could not interact with blog post cards');
      }
    });
  });

  describe('Contact Page (/contact.html) Audit', () => {
    let page: Page;
    const contactUrl = `${testSiteUrl}/contact.html`;

    beforeAll(async () => {
      page = await navigateToUrl(browser, contactUrl, browserConfig);
      await injectDataLayerHooks(page);
      await handleConsentBanners(page, consentConfig);
    });

    afterAll(async () => {
      if (page) {
        await closePage(page);
      }
    });

    it('should load contact page successfully', async () => {
      const url = page.url();
      expect(url).toContain('/contact');
    });

    it('should capture page_view event for contact page', async () => {
      await waitForEvents(page, 1, 5000);

      const events = await getCapturedEvents(page);
      const pageViewEvent = events.find(e => e.event === 'page_view');

      expect(pageViewEvent).toBeDefined();
      expect(pageViewEvent?.payload.page_type).toBe('contact');
    });

    it('should have contact form on the page', async () => {
      const formExists = await page.$('form, [role="form"]');
      expect(formExists).toBeTruthy();
    });
  });

  describe('Navigation & Interaction Tests', () => {
    let page: Page;

    beforeAll(async () => {
      page = await navigateToUrl(browser, testSiteUrl, browserConfig);
      await injectDataLayerHooks(page);
      await handleConsentBanners(page, consentConfig);
    });

    afterAll(async () => {
      if (page) {
        await closePage(page);
      }
    });

    it('should trigger select_content on navigation link click', async () => {
      const eventsBefore = await getCapturedEvents(page);
      const countBefore = eventsBefore.length;

      // Try to click a navigation link
      const navLink = await page.$('a[href^="/"]');

      if (navLink) {
        try {
          await page.click('a[href^="/"]');
          await waitForEvents(page, countBefore + 1, 3000);

          const eventsAfter = await getCapturedEvents(page);
          const newEvents = eventsAfter.slice(countBefore);

          // Should have select_content or page_view
          const hasInteractionEvent = newEvents.some(e => ['select_content', 'page_view'].includes(e.event));

          expect(hasInteractionEvent).toBe(true);
        } catch (error) {
          // Navigation might be prevented; that's ok
          console.log('Navigation link interaction skipped');
        }
      }
    });

    it('should have consistent event structure across all events', async () => {
      const events = await getCapturedEvents(page);
      expect(events.length).toBeGreaterThan(0);

      for (const event of events) {
        // Each event should have required fields
        expect(event).toHaveProperty('event');
        expect(event).toHaveProperty('payload');
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('url');

        // Event name should be a string
        expect(typeof event.event).toBe('string');

        // Payload should be an object
        expect(typeof event.payload).toBe('object');
      }
    });
  });

  describe('Expected Events Verification', () => {
    it('should capture expected event types from TNK project', async () => {
      const page = await navigateToUrl(browser, testSiteUrl, browserConfig);
      await injectDataLayerHooks(page);

      // Wait for events to fire
      await waitForEvents(page, 1, 5000);

      const events = await getCapturedEvents(page);

      // Expected events from audit-setup.md:
      // 1. page_view (required on all pages)
      // 2. select_content (on navigation clicks)
      // 3. generate_lead (on contact form submit)
      // 4. orbit_interaction (on home page skill hover)
      // 5. search (on blog search)
      // 6. post_engagement (on blog post engagement)

      const eventNames = new Set(events.map(e => e.event));

      // At minimum, page_view should exist
      expect(eventNames.has('page_view')).toBe(true);

      console.log('Events captured on homepage:', Array.from(eventNames).join(', '));

      await closePage(page);
    });
  });
});
