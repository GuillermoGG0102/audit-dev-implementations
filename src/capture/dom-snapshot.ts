/**
 * DOM snapshot and context capture.
 * Captures page metadata and element context for events.
 */

import { Page } from 'playwright';
import logger from '../core/logger.js';

export interface DOMContext {
  pageTitle: string;
  pageUrl: string;
  viewportSize: { width: number; height: number } | null;
  triggeringElement?: {
    selector: string;
    text: string;
    className: string;
    id: string;
    tagName: string;
    href?: string;
    ariaLabel?: string;
  };
}

/**
 * Capture current page DOM context.
 */
export async function capturePageContext(page: Page): Promise<Omit<DOMContext, 'triggeringElement'>> {
  try {
    const context = await page.evaluate(() => {
      const title = document.title || '';
      const url = window.location.href;
      const viewport = (window as any).innerWidth ? { width: window.innerWidth, height: window.innerHeight } : null;

      return {
        pageTitle: title,
        pageUrl: url,
        viewportSize: viewport,
      };
    });

    logger.debug('Page context captured', { title: context.pageTitle, url: context.pageUrl });
    return context;
  } catch (error) {
    logger.warn('Failed to capture page context', { error });
    return {
      pageTitle: '',
      pageUrl: await page.url(),
      viewportSize: null,
    };
  }
}

/**
 * Capture DOM context for a specific element (used when capturing event triggers).
 */
export async function captureElementContext(page: Page, selector: string): Promise<DOMContext['triggeringElement'] | null> {
  try {
    const context = await page.evaluate((sel: string) => {
      const element = document.querySelector(sel);
      if (!element) return null;

      const rect = element.getBoundingClientRect();

      return {
        selector: sel,
        text: (element.textContent || '').substring(0, 100), // Limit to 100 chars
        className: element.className || '',
        id: element.id || '',
        tagName: element.tagName.toLowerCase(),
        href: (element as any).href || undefined,
        ariaLabel: element.getAttribute('aria-label') || undefined,
        visible: rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth,
      };
    }, selector);

    if (context) {
      logger.debug('Element context captured', { selector, tagName: context.tagName, text: context.text.substring(0, 50) });
    }

    return context as any;
  } catch (error) {
    logger.debug('Failed to capture element context', { selector, error });
    return null;
  }
}

/**
 * Find a selector for the element that triggered an event.
 * Used to retroactively identify which element caused a dataLayer event.
 */
export async function findElementBySelectorHeuristics(page: Page, eventData: any): Promise<string | null> {
  try {
    // Try to extract hints from event data
    const clickElement = eventData?.element_id || eventData?.element || eventData?.content_name;

    if (!clickElement) {
      return null;
    }

    // Look for element by ID, class, or content match
    const selector = await page.evaluate((hint: string) => {
      // Try ID first
      if (document.getElementById(hint)) {
        return `#${hint}`;
      }

      // Try class selector
      const byClass = document.querySelector(`.${hint}`);
      if (byClass) {
        return `.${hint}`;
      }

      // Try finding by text content
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
      );

      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent && node.textContent.includes(hint)) {
          const parent = (node as any).parentElement;
          if (parent && parent.className) {
            return `.${parent.className.split(' ')[0]}`;
          }
        }
      }

      return null;
    }, clickElement);

    if (selector) {
      logger.debug('Found element selector via heuristics', { hint: clickElement, selector });
    }

    return selector;
  } catch (error) {
    logger.debug('Failed to find element by heuristics', { error });
    return null;
  }
}
