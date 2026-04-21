/**
 * Event normalization.
 * Converts raw dataLayer events into normalized, validated event data.
 */

import logger from '../core/logger.js';
import { RawDataLayerEvent, NormalizedEvent, Evidence } from '../core/types.js';

/**
 * Normalize raw captured events into stable, structured format.
 * Validates presence of required fields and converts naming conventions.
 */
export function normalizeRawEvents(
  rawEvents: RawDataLayerEvent[],
  _pageUrl: string,
  evidence: Evidence[] = [],
): NormalizedEvent[] {
  try {
    logger.debug('Normalizing raw events', { count: rawEvents.length });

    const normalized: NormalizedEvent[] = [];

    for (const raw of rawEvents) {
      try {
        const event = normalizeEvent(raw, evidence);
        if (event) {
          normalized.push(event);
        }
      } catch (error) {
        logger.warn('Failed to normalize event', { event: raw.event, error });
        // Continue with next event
      }
    }

    logger.debug('Events normalized', { count: normalized.length });
    return normalized;
  } catch (error) {
    logger.error('Failed to normalize events', { error });
    return [];
  }
}

/**
 * Normalize a single raw event.
 */
function normalizeEvent(raw: RawDataLayerEvent, evidence: Evidence[]): NormalizedEvent | null {
  // Skip events with no name
  if (!raw.event || typeof raw.event !== 'string') {
    logger.debug('Skipping event with missing or invalid name');
    return null;
  }

  const normalized: NormalizedEvent = {
    eventName: raw.event,
    parameters: sanitizeParameters(raw.payload || {}),
    url: raw.url || '',
    triggeredBy: raw.triggeredBy || 'pageLoad',
    timestamp: raw.timestamp || Date.now(),
    evidence: evidence.filter(e => e.timestamp === raw.timestamp), // Match by timestamp
  };

  return normalized;
}

/**
 * Validate that an event has all required parameters.
 * Returns array of missing parameter names.
 */
export function validateEventParameters(
  _eventName: string,
  parameters: Record<string, unknown>,
  requiredParams: string[],
): string[] {
  const missing: string[] = [];

  for (const param of requiredParams) {
    if (!(param in parameters) || parameters[param] === null || parameters[param] === undefined) {
      missing.push(param);
    }
  }

  return missing;
}

/**
 * Check if parameter value matches expected type.
 */
export function validateParameterType(value: unknown, expectedType: string): boolean {
  const actualType = typeof value;

  switch (expectedType) {
    case 'string':
      return actualType === 'string';
    case 'number':
      return actualType === 'number' && !isNaN(value as number);
    case 'boolean':
      return actualType === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return actualType === 'object' && !Array.isArray(value) && value !== null;
    case 'any':
      return value !== null && value !== undefined;
    default:
      return true;
  }
}

/**
 * Remove or sanitize sensitive parameters.
 */
export function sanitizeParameters(params: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...params };

  // List of sensitive parameter names to remove or mask
  const sensitiveParams = ['password', 'token', 'secret', 'api_key', 'email', 'credit_card', 'ssn'];

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();

    // Remove or mask sensitive data
    if (sensitiveParams.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }

    // Remove null and undefined values
    if (sanitized[key] === null || sanitized[key] === undefined) {
      delete sanitized[key];
    }

    // Convert circular references to string
    if (typeof sanitized[key] === 'object') {
      try {
        JSON.stringify(sanitized[key]);
      } catch {
        sanitized[key] = '[CIRCULAR]';
      }
    }
  }

  return sanitized;
}

/**
 * Deduplicate events based on name, parameters, and timing.
 * Considers events within timeWindow as duplicates if payload is identical.
 */
export function deduplicateEvents(
  events: NormalizedEvent[],
  timeWindow: number = 1000,
): NormalizedEvent[] {
  if (events.length <= 1) {
    return events;
  }

  const deduplicated: NormalizedEvent[] = [];
  const seen = new Map<string, NormalizedEvent>();

  for (const event of events) {
    const key = createEventKey(event);
    const existing = seen.get(key);

    if (!existing) {
      deduplicated.push(event);
      seen.set(key, event);
    } else if (event.timestamp - existing.timestamp > timeWindow) {
      // Events with same key but outside time window are considered different
      deduplicated.push(event);
    } else {
      // Duplicate found; update timestamp to later one
      logger.debug('Deduplicating event', { event: event.eventName, timestamp: event.timestamp });
      existing.timestamp = Math.max(existing.timestamp, event.timestamp);
    }
  }

  return deduplicated;
}

/**
 * Create a unique key for event deduplication.
 */
function createEventKey(event: NormalizedEvent): string {
  const paramString = JSON.stringify(event.parameters);
  return `${event.eventName}::${paramString}`;
}

/**
 * Group events by URL.
 */
export function groupEventsByUrl(events: NormalizedEvent[]): Map<string, NormalizedEvent[]> {
  const grouped = new Map<string, NormalizedEvent[]>();

  for (const event of events) {
    const url = event.url || 'unknown';
    if (!grouped.has(url)) {
      grouped.set(url, []);
    }
    grouped.get(url)!.push(event);
  }

  return grouped;
}

/**
 * Group events by name.
 */
export function groupEventsByName(events: NormalizedEvent[]): Map<string, NormalizedEvent[]> {
  const grouped = new Map<string, NormalizedEvent[]>();

  for (const event of events) {
    if (!grouped.has(event.eventName)) {
      grouped.set(event.eventName, []);
    }
    grouped.get(event.eventName)!.push(event);
  }

  return grouped;
}

/**
 * Get event statistics from normalized events.
 */
export function getEventStatistics(events: NormalizedEvent[]): {
  totalEvents: number;
  uniqueEventNames: string[];
  eventCountByName: { [name: string]: number };
  eventCountByUrl: { [url: string]: number };
  pageLoadEvents: number;
  interactionEvents: number;
} {
  const byName = groupEventsByName(events);
  const byUrl = groupEventsByUrl(events);

  const eventCountByName: { [name: string]: number } = {};
  const eventCountByUrl: { [url: string]: number } = {};

  for (const [name, list] of byName) {
    eventCountByName[name] = list.length;
  }

  for (const [url, list] of byUrl) {
    eventCountByUrl[url] = list.length;
  }

  const pageLoadEvents = events.filter(e => e.triggeredBy === 'pageLoad').length;
  const interactionEvents = events.filter(e => e.triggeredBy === 'interaction').length;

  return {
    totalEvents: events.length,
    uniqueEventNames: Array.from(byName.keys()),
    eventCountByName,
    eventCountByUrl,
    pageLoadEvents,
    interactionEvents,
  };
}
