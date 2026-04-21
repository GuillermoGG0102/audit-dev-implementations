/**
 * Configuration loading and validation.
 * Loads audit config from YAML files and environment variables.
 */

import logger from './logger.js';
import { AuditConfig } from './types.js';

/**
 * Load and parse audit configuration.
 * Priority: CLI args > env vars > config file > defaults
 */
export async function loadAuditConfig(
  configPath: string = 'config/default.audit.yaml',
  overrides?: Partial<AuditConfig>,
): Promise<AuditConfig> {
  try {
    logger.debug('Loading audit configuration', { configPath });

    // Start with defaults
    const config = getDefaultConfig();

    // Load from file if it exists
    if (configPath) {
      try {
        const fileConfig = await loadConfigFromFile(configPath);
        deepMerge(config, fileConfig);
        logger.debug('Configuration loaded from file', { configPath });
      } catch (error) {
        logger.warn('Failed to load config file, using defaults', { configPath, error });
      }
    }

    // Apply environment variable overrides
    applyEnvOverrides(config);

    // Apply explicit overrides
    if (overrides) {
      deepMerge(config, overrides);
      logger.debug('Configuration overrides applied');
    }

    // Validate configuration
    validateConfig(config);

    logger.info('Audit configuration loaded successfully');
    return config;
  } catch (error) {
    logger.error('Failed to load audit configuration', { error });
    throw error;
  }
}

/**
 * Get default configuration.
 */
export function getDefaultConfig(): AuditConfig {
  return {
    crawl: {
      depth: 1,
      maxPages: 10,
      followExternalLinks: false,
      includePatterns: [],
      excludePatterns: ['/admin', '/api', '/logout'],
    },
    browser: {
      headless: true,
      timeout: 30000,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1280, height: 720 },
    },
    consent: {
      banners: [],
    },
    interactions: {
      allowed: ['click', 'scroll', 'input'],
      blocked: ['submit', 'checkout', 'logout', 'delete'],
    },
    capture: {
      events: true,
      screenshots: true,
      console: false,
      network: false,
      domSnapshot: true,
      timing: true,
    },
    evidence: {
      screenshotOnInteraction: true,
      domContextSize: 5000,
      maxScreenshots: 100,
    },
  };
}

/**
 * Load configuration from YAML file.
 */
async function loadConfigFromFile(filePath: string): Promise<Partial<AuditConfig>> {
  try {
    // Dynamically import YAML parser
    const { parse } = await import('yaml');
    const { readFileSync } = await import('fs');

    const content = readFileSync(filePath, 'utf-8');
    const config = parse(content) as Partial<AuditConfig>;

    return config;
  } catch (error) {
    logger.error('Failed to read config file', { filePath, error });
    throw error;
  }
}

/**
 * Apply environment variable overrides to config.
 */
function applyEnvOverrides(config: AuditConfig): void {
  // Browser config from env
  if (process.env.HEADLESS !== undefined) {
    config.browser.headless = process.env.HEADLESS !== 'false';
  }

  if (process.env.BROWSER_TIMEOUT) {
    config.browser.timeout = parseInt(process.env.BROWSER_TIMEOUT, 10);
  }

  if (process.env.VIEWPORT_WIDTH && process.env.VIEWPORT_HEIGHT) {
    config.browser.viewport.width = parseInt(process.env.VIEWPORT_WIDTH, 10);
    config.browser.viewport.height = parseInt(process.env.VIEWPORT_HEIGHT, 10);
  }

  // Crawl config from env
  if (process.env.CRAWL_DEPTH) {
    config.crawl.depth = parseInt(process.env.CRAWL_DEPTH, 10);
  }

  if (process.env.CRAWL_MAX_PAGES) {
    config.crawl.maxPages = parseInt(process.env.CRAWL_MAX_PAGES, 10);
  }

  // Capture config from env
  if (process.env.CAPTURE_SCREENSHOTS !== undefined) {
    config.capture.screenshots = process.env.CAPTURE_SCREENSHOTS !== 'false';
  }

  logger.debug('Environment variable overrides applied');
}

/**
 * Validate configuration values.
 */
function validateConfig(config: AuditConfig): void {
  // Validate browser config
  if (config.browser.timeout < 1000) {
    logger.warn('Browser timeout is very low, increasing to 1000ms', { current: config.browser.timeout });
    config.browser.timeout = 1000;
  }

  if (config.browser.viewport.width < 320 || config.browser.viewport.height < 240) {
    logger.warn('Viewport size is very small, resetting to defaults', {
      width: config.browser.viewport.width,
      height: config.browser.viewport.height,
    });
    config.browser.viewport = { width: 1280, height: 720 };
  }

  // Validate crawl config
  if (config.crawl.depth < 0) {
    logger.warn('Crawl depth cannot be negative, setting to 0', { current: config.crawl.depth });
    config.crawl.depth = 0;
  }

  if (config.crawl.maxPages < 1) {
    logger.warn('Max pages must be at least 1, setting to 10', { current: config.crawl.maxPages });
    config.crawl.maxPages = 10;
  }

  logger.debug('Configuration validated');
}

/**
 * Deep merge source object into target object.
 */
function deepMerge(target: any, source: any): void {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        if (typeof target[key] !== 'object') {
          target[key] = {};
        }
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
}

/**
 * Resolve configuration file path.
 * Returns the full path or throws if file doesn't exist.
 */
export function resolveConfigPath(configName: string): string {
  const { resolve } = require('path');
  const { existsSync } = require('fs');

  // Try multiple locations
  const possiblePaths = [
    resolve(process.cwd(), configName),
    resolve(process.cwd(), 'config', configName),
    resolve(process.cwd(), 'config', `${configName}.yaml`),
    resolve(process.cwd(), 'config', `${configName}.yml`),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      logger.debug('Config file found', { path });
      return path;
    }
  }

  logger.warn('Config file not found, will use defaults', { searched: possiblePaths });
  return '';
}
