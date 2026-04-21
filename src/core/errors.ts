/**
 * Custom error types for the audit tool.
 */

export class AuditorError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AuditorError';
  }
}

export class ConfigError extends AuditorError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigError';
  }
}

export class CrawlError extends AuditorError {
  constructor(message: string) {
    super(message, 'CRAWL_ERROR');
    this.name = 'CrawlError';
  }
}

export class BrowserError extends AuditorError {
  constructor(message: string) {
    super(message, 'BROWSER_ERROR');
    this.name = 'BrowserError';
  }
}

export class CaptureError extends AuditorError {
  constructor(message: string) {
    super(message, 'CAPTURE_ERROR');
    this.name = 'CaptureError';
  }
}

export class ValidationError extends AuditorError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ReportError extends AuditorError {
  constructor(message: string) {
    super(message, 'REPORT_ERROR');
    this.name = 'ReportError';
  }
}
