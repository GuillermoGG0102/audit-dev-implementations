/**
 * Playwright browser launch and page navigation.
 * Handles browser setup, page navigation, and readiness detection.
 */

import { chromium, Browser, Page } from 'playwright';
import logger from '../core/logger.js';
import { BrowserError } from '../core/errors.js';
import { BrowserConfig } from '../core/types.js';

/**
 * Launch a Playwright browser instance with configuration.
 */
export async function launchBrowser(config: BrowserConfig): Promise<Browser> {
  try {
    logger.info('Launching Playwright browser', {
      headless: config.headless,
      timeout: config.timeout,
    });

    const launchArgs = {
      headless: config.headless,
      args: [] as string[],
    };

    // Add sandbox flag if specified in config
    if (config.headless && process.env.BROWSER_ARGS) {
      const args = process.env.BROWSER_ARGS.split(' ').filter(Boolean);
      launchArgs.args = args;
    }

    const browser = await chromium.launch(launchArgs);

    logger.info('Browser launched successfully');
    return browser;
  } catch (error) {
    logger.error('Failed to launch browser', { error });
    throw new BrowserError(`Failed to launch browser: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Navigate to a URL and wait for page to be ready.
 */
export async function navigateToUrl(
  browser: Browser,
  url: string,
  config: BrowserConfig,
): Promise<Page> {
  let page: Page | null = null;

  try {
    logger.info('Creating new browser context and page', { url });

    // Create context with custom viewport
    const context = await browser.newContext({
      viewport: {
        width: config.viewport.width,
        height: config.viewport.height,
      },
      userAgent: config.userAgent,
    });

    // Inject hooks at context level BEFORE page creation
    // This ensures hooks are ready before any page scripts run
    await context.addInitScript(() => {
      (window as any).__dl_events = [];
      (window as any).__dl_ready = false;
      const originalDataLayer = (window as any).dataLayer;
      const proxyDataLayer = {
        push: function (event: any) {
          const timestamp = Date.now();
          const capturedEvent = {
            event: event?.event,
            payload: { ...event },
            timestamp,
            url: window.location.href,
          };
          (window as any).__dl_events.push(capturedEvent);
          if (Array.isArray(originalDataLayer)) {
            originalDataLayer.push(event);
          }
          return capturedEvent;
        },
        [Symbol.iterator]: function* () {
          if (Array.isArray(originalDataLayer)) {
            yield* originalDataLayer;
          }
        },
      };
      (window as any).dataLayer = proxyDataLayer;
      console.log('[dl-auditor] dataLayer capture hooks injected at context level');
    });

    page = await context.newPage();

    // Set timeout for this page
    page.setDefaultTimeout(config.timeout);
    page.setDefaultNavigationTimeout(config.timeout);

    logger.info('Navigating to URL', { url });

    // Navigate and wait for network idle
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: config.timeout,
    });

    logger.info('Page loaded and network idle', { url });

    // Wait for DOM to be interactive
    await page.waitForLoadState('domcontentloaded');

    // Allow custom ready event if present (for SPA detection)
    try {
      await page.waitForFunction(
        () => {
          const readyEvent = (window as any).__dl_ready;
          return readyEvent === true;
        },
        { timeout: 3000 },
      ).catch(() => {
        // Custom ready event not found; continue anyway
        logger.debug('Custom ready event not found; proceeding with standard load');
      });
    } catch {
      logger.debug('Custom ready detection skipped');
    }

    logger.info('Page is ready for audit', { url });

    return page;
  } catch (error) {
    if (page) {
      await page.close().catch(closeErr => {
        logger.warn('Error closing page after navigation failure', { error: closeErr });
      });
    }

    logger.error('Failed to navigate to URL', { url, error });
    throw new BrowserError(
      `Failed to navigate to ${url}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Close a page safely.
 */
export async function closePage(page: Page): Promise<void> {
  try {
    await page.close();
    logger.debug('Page closed');
  } catch (error) {
    logger.warn('Error closing page', { error });
  }
}

/**
 * Close browser safely.
 */
export async function closeBrowser(browser: Browser): Promise<void> {
  try {
    await browser.close();
    logger.info('Browser closed');
  } catch (error) {
    logger.warn('Error closing browser', { error });
  }
}

/**
 * Take a screenshot of the current page.
 */
export async function takeScreenshot(page: Page, filename: string): Promise<Buffer> {
  try {
    logger.debug('Taking screenshot', { filename });

    const screenshot = await page.screenshot({
      fullPage: true,
      type: 'png',
    });

    logger.debug('Screenshot captured', { filename, size: screenshot.length });
    return screenshot;
  } catch (error) {
    logger.warn('Failed to take screenshot', { filename, error });
    throw new BrowserError(`Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`);
  }
}
