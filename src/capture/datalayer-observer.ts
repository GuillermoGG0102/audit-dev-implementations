/**
 * Advanced dataLayer observation and monitoring.
 * Provides capabilities for detailed event inspection and filtering.
 */

import { Page } from 'playwright';
import logger from '../core/logger.js';

export interface EventFilter {
  eventName?: string | string[];
  timeRange?: { start: number; end: number };
  hasParameter?: string;
  parameterValue?: { [key: string]: any };
}

/**
 * Filter captured events based on criteria.
 */
export async function filterCapturedEvents(page: Page, filter: EventFilter): Promise<any[]> {
  try {
    logger.debug('Filtering events', { filter });

    const filtered = await page.evaluate((filterCriteria: EventFilter) => {
      const events = (window as any).__dl_events || [];

      return events.filter((event: any) => {
        // Filter by event name
        if (filterCriteria.eventName) {
          const names = Array.isArray(filterCriteria.eventName) ? filterCriteria.eventName : [filterCriteria.eventName];
          if (!names.includes(event.event)) {
            return false;
          }
        }

        // Filter by time range
        if (filterCriteria.timeRange) {
          if (event.timestamp < filterCriteria.timeRange.start || event.timestamp > filterCriteria.timeRange.end) {
            return false;
          }
        }

        // Filter by parameter presence
        if (filterCriteria.hasParameter) {
          if (!(filterCriteria.hasParameter in event.payload)) {
            return false;
          }
        }

        // Filter by parameter value
        if (filterCriteria.parameterValue) {
          for (const [key, value] of Object.entries(filterCriteria.parameterValue)) {
            if (event.payload?.[key] !== value) {
              return false;
            }
          }
        }

        return true;
      });
    }, filter);

    logger.debug('Events filtered', { count: filtered.length });
    return filtered;
  } catch (error) {
    logger.warn('Failed to filter events', { error });
    return [];
  }
}

/**
 * Get first occurrence of a specific event.
 */
export async function getFirstEvent(page: Page, eventName: string): Promise<any | null> {
  try {
    const event = await page.evaluate((name: string) => {
      const events = (window as any).__dl_events || [];
      return events.find((e: any) => e.event === name) || null;
    }, eventName);

    return event;
  } catch (error) {
    logger.debug('Failed to get first event', { eventName, error });
    return null;
  }
}

/**
 * Get all events of a specific type.
 */
export async function getEventsByName(page: Page, eventName: string): Promise<any[]> {
  try {
    const events = await page.evaluate((name: string) => {
      const allEvents = (window as any).__dl_events || [];
      return allEvents.filter((e: any) => e.event === name);
    }, eventName);

    logger.debug('Retrieved events by name', { eventName, count: events.length });
    return events;
  } catch (error) {
    logger.warn('Failed to get events by name', { eventName, error });
    return [];
  }
}

/**
 * Check if a specific event was captured.
 */
export async function hasEvent(page: Page, eventName: string): Promise<boolean> {
  try {
    const exists = await page.evaluate((name: string) => {
      const events = (window as any).__dl_events || [];
      return events.some((e: any) => e.event === name);
    }, eventName);

    return exists;
  } catch (error) {
    logger.debug('Failed to check event existence', { eventName, error });
    return false;
  }
}

/**
 * Get event statistics (count, timing, parameters).
 */
export async function getEventStatistics(page: Page): Promise<{
  totalEvents: number;
  uniqueEventNames: string[];
  eventCounts: { [name: string]: number };
  firstEventTime: number;
  lastEventTime: number;
  totalTimespan: number;
}> {
  try {
    const stats = await page.evaluate(() => {
      const events = (window as any).__dl_events || [];

      if (events.length === 0) {
        return {
          totalEvents: 0,
          uniqueEventNames: [],
          eventCounts: {},
          firstEventTime: 0,
          lastEventTime: 0,
          totalTimespan: 0,
        };
      }

      const eventCounts: { [name: string]: number } = {};
      let firstTime = events[0].timestamp;
      let lastTime = events[0].timestamp;

      for (const event of events) {
        eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
        firstTime = Math.min(firstTime, event.timestamp);
        lastTime = Math.max(lastTime, event.timestamp);
      }

      return {
        totalEvents: events.length,
        uniqueEventNames: Object.keys(eventCounts),
        eventCounts,
        firstEventTime: firstTime,
        lastEventTime: lastTime,
        totalTimespan: lastTime - firstTime,
      };
    });

    logger.debug('Event statistics retrieved', stats);
    return stats;
  } catch (error) {
    logger.warn('Failed to get event statistics', { error });
    return {
      totalEvents: 0,
      uniqueEventNames: [],
      eventCounts: {},
      firstEventTime: 0,
      lastEventTime: 0,
      totalTimespan: 0,
    };
  }
}

/**
 * Export captured events in JSON format.
 */
export async function exportEventsAsJson(page: Page): Promise<string> {
  try {
    const events = await page.evaluate(() => {
      return (window as any).__dl_events || [];
    });

    return JSON.stringify(events, null, 2);
  } catch (error) {
    logger.warn('Failed to export events as JSON', { error });
    return '[]';
  }
}

/**
 * Enable verbose logging of all dataLayer.push calls.
 * Useful for debugging event capture.
 */
export async function enableVerboseLogging(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      const originalPush = (window as any).dataLayer.push;

      (window as any).dataLayer.push = function (event: any) {
        console.log('[dl-auditor] dataLayer.push called:', event);
        return originalPush.call(this, event);
      };

      logger.debug('Verbose logging enabled for dataLayer');
    });

    logger.debug('Verbose logging enabled');
  } catch (error) {
    logger.warn('Failed to enable verbose logging', { error });
  }
}
