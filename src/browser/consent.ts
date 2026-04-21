/**
 * Consent banner detection and dismissal.
 * Handles GDPR/privacy consent banners by finding and clicking dismiss buttons.
 */

import { Page } from 'playwright';
import logger from '../core/logger.js';
import { ConsentConfig } from '../core/types.js';

/**
 * Detect and dismiss consent banners on the page.
 * Tries selectors in priority order until one succeeds.
 */
export async function handleConsentBanners(page: Page, config: ConsentConfig): Promise<boolean> {
  try {
    // If no consent banners configured, skip
    if (!config.banners || config.banners.length === 0) {
      logger.debug('No consent banner selectors configured; skipping consent handling');
      return false;
    }

    logger.debug('Attempting to handle consent banners', { count: config.banners.length });

    // Sort by priority (lower number = higher priority)
    const sortedBanners = [...config.banners].sort((a, b) => a.priority - b.priority);

    for (const banner of sortedBanners) {
      try {
        logger.debug('Checking for consent banner', { selector: banner.selector, priority: banner.priority });

        // Check if element exists
        const element = await page.$(banner.selector);

        if (element) {
          logger.info('Found consent banner, attempting dismiss', { selector: banner.selector });

          // Wait for element to be visible
          await page.waitForSelector(banner.selector, { timeout: 2000 }).catch(() => {
            logger.debug('Consent banner not visible; may not be present on this page');
          });

          // Try to click it
          try {
            await page.click(banner.selector);
            await page.waitForTimeout(500); // Let dismiss action complete

            logger.info('Consent banner dismissed successfully', { selector: banner.selector });
            return true;
          } catch (clickError) {
            logger.warn('Failed to click consent banner', { selector: banner.selector, error: clickError });
            // Continue to next selector
          }
        }
      } catch (error) {
        logger.debug('Error checking consent banner', { selector: banner.selector, error });
        // Continue to next selector
      }
    }

    logger.debug('No consent banners found or dismissed');
    return false;
  } catch (error) {
    logger.warn('Error handling consent banners', { error });
    // Don't throw; consent handling is optional
    return false;
  }
}

/**
 * Detect if a consent banner is currently visible.
 */
export async function isConsentBannerVisible(page: Page, config: ConsentConfig): Promise<boolean> {
  try {
    if (!config.banners || config.banners.length === 0) {
      return false;
    }

    for (const banner of config.banners) {
      try {
        const element = await page.$(banner.selector);
        const isVisible = element ? await element.isVisible() : false;

        if (isVisible) {
          logger.debug('Consent banner is visible', { selector: banner.selector });
          return true;
        }
      } catch (error) {
        // Ignore errors; just check next selector
      }
    }

    return false;
  } catch (error) {
    logger.warn('Error checking consent banner visibility', { error });
    return false;
  }
}

/**
 * Add a consent banner selector to the config.
 * Useful for runtime configuration updates.
 */
export function addConsentSelector(config: ConsentConfig, selector: string, priority: number = 10): void {
  if (!config.banners) {
    config.banners = [];
  }

  config.banners.push({ selector, priority });
  logger.debug('Consent selector added', { selector, priority });
}
