/**
 * Shared domain types for the dl-auditor project.
 * Keep these stable; they are the contract between layers.
 */

/**
 * A URL discovered during crawl or provided as input.
 */
export interface AuditURL {
  url: string;
  depth: number;
  source: 'sitemap' | 'crawl' | 'manual';
  discoveredAt: Date;
}

/**
 * A raw dataLayer.push event captured during audit.
 */
export interface RawDataLayerEvent {
  event: string;
  payload: Record<string, unknown>;
  timestamp: number;
  url: string;
  triggeredBy: 'pageLoad' | 'interaction';
  interactionContext?: InteractionContext;
  domContext?: DOMContext;
}

/**
 * Context about the user interaction that triggered an event.
 */
export interface InteractionContext {
  type: 'click' | 'scroll' | 'input' | 'select' | 'form_submit';
  selector?: string;
  text?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Snapshot of DOM state when event fired.
 */
export interface DOMContext {
  pageTitle: string;
  canonicalURL: string;
  elementSelector?: string;
  elementAttributes?: Record<string, string>;
}

/**
 * Normalized event after audit processing.
 */
export interface NormalizedEvent {
  eventName: string;
  parameters: Record<string, unknown>;
  url: string;
  triggeredBy: 'pageLoad' | 'interaction';
  timestamp: number;
  evidence: Evidence[];
}

/**
 * Proof that an event was observed.
 */
export interface Evidence {
  type: 'screenshot' | 'rawPayload' | 'domSnapshot' | 'networkLog';
  data: string | Buffer;
  timestamp: number;
}

/**
 * Result of auditing a single URL.
 */
export interface PageAuditResult {
  url: string;
  startTime: Date;
  endTime: Date;
  pageEvents: NormalizedEvent[];
  interactionEvents: Map<string, NormalizedEvent[]>;
  warnings: AuditWarning[];
  rawCapture: RawDataLayerEvent[];
}

/**
 * Warning or issue during audit.
 */
export interface AuditWarning {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  url: string;
}

/**
 * Result of validating events against tagging spec.
 */
export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  affectedEvent?: string;
  affectedURL?: string;
  suggestion?: string;
}

/**
 * Configuration for an audit run.
 */
export interface AuditConfig {
  crawl: CrawlConfig;
  browser: BrowserConfig;
  consent: ConsentConfig;
  interactions: InteractionConfig;
  capture: CaptureConfig;
  evidence: EvidenceConfig;
}

export interface CrawlConfig {
  depth: number;
  maxPages: number;
  followExternalLinks: boolean;
  includePatterns: string[];
  excludePatterns: string[];
}

export interface BrowserConfig {
  headless: boolean;
  timeout: number;
  userAgent: string;
  viewport: { width: number; height: number };
}

export interface ConsentConfig {
  banners: ConsentBanner[];
}

export interface ConsentBanner {
  selector: string;
  priority: number;
}

export interface InteractionConfig {
  allowed: string[];
  blocked: string[];
}

export interface CaptureConfig {
  events: boolean;
  screenshots: boolean;
  console: boolean;
  network: boolean;
  domSnapshot: boolean;
  timing: boolean;
}

export interface EvidenceConfig {
  screenshotOnInteraction: boolean;
  domContextSize: number;
  maxScreenshots: number;
}

/**
 * Final report data.
 */
export interface ReportData {
  clientName: string;
  auditDate: Date;
  scope: AuditScope;
  events: NormalizedEvent[];
  validationResults: ValidationResult[];
  complianceScore: number;
  riskFlags: RiskFlag[];
}

export interface AuditScope {
  baseURL: string;
  depth: number;
  urlsAudited: string[];
  interactionsRun: string[];
  dateRange: { start: Date; end: Date };
}

export interface RiskFlag {
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedURLs: string[];
  recommendation: string;
}
