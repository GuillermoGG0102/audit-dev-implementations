# dl-auditor Architecture

## Overview

The auditor is organized into six independent layers, each with clear responsibilities and contracts. Data flows through these layers sequentially:

```
Crawler → Browser → Capture → Audit → Rules → Report
```

---

## Layer 1: Crawler

**Responsibility:** Discover all URLs to audit.

- Parse sitemaps (XML, RSS)
- Crawl site structure with configurable depth
- Deduplicate URLs
- Filter by include/exclude patterns
- Respect robots.txt and rate limits
- Output: List of `AuditURL[]`

**Key files:**
- `src/crawler/sitemap.ts` — XML/RSS parsing
- `src/crawler/discover.ts` — crawling logic
- `src/crawler/url-queue.ts` — queue management and deduplication

**Inputs:** Base URL, crawl config (depth, patterns, limits)
**Outputs:** Ordered list of URLs ready for browser audit

---

## Layer 2: Browser

**Responsibility:** Open URLs in a browser and prepare for observation.

- Launch Playwright browser with safe defaults
- Handle consent banners (GDPR, analytics opt-in)
- Navigate to URL and wait for page load
- Install hooks for dataLayer interception
- Observable: page ready state, network idle, custom events

**Key files:**
- `src/browser/launch.ts` — Playwright setup
- `src/browser/consent.ts` — Consent banner detection and handling
- `src/browser/hooks.ts` — Browser-side JavaScript hooks for dataLayer
- `src/browser/interaction-runner.ts` — Safe interaction execution

**Inputs:** URL, browser config, consent config
**Outputs:** Open browser page ready for interaction, hooks installed for event capture

**Safety:** All interactions are validated against allowlist before execution. Destructive actions (forms, checkout, logout) are blocked by default and require explicit config override.

---

## Layer 3: Capture

**Responsibility:** Record everything observed on the page.

- Intercept all `dataLayer.push` calls
- Record event name, payload, timestamp
- Capture DOM context (selector, attributes)
- Optional: network logs, console output
- Screenshot on demand
- Track whether event was triggered by page load or interaction

**Key files:**
- `src/capture/datalayer-observer.ts` — Event interception via window.dataLayer override
- `src/capture/network-observer.ts` — HAR log capture
- `src/capture/console-observer.ts` — Console.log/error capture
- `src/capture/dom-snapshot.ts` — Page state snapshots

**Inputs:** Open browser page with hooks installed
**Outputs:** `RawDataLayerEvent[]` with full context

**Non-negotiable:** Never discard events. Raw logs are preserved; deduplication happens only in normalized views.

---

## Layer 4: Audit

**Responsibility:** Normalize raw observations into stable domain models.

- Convert raw events to `NormalizedEvent`
- Associate events with URLs and interactions
- Collect evidence (screenshots, DOM context)
- Preserve ordering and timing
- Flag warnings (timeouts, consent issues)

**Key files:**
- `src/audit/page-audit.ts` — Orchestrate page-level audit
- `src/audit/interaction-audit.ts` — Interaction-triggered event collection
- `src/audit/normalizer.ts` — Raw → normalized conversion
- `src/audit/evidence.ts` — Evidence collection and storage

**Inputs:** Raw events from capture layer
**Outputs:** `PageAuditResult` with normalized events, evidence, warnings

---

## Layer 5: Rules

**Responsibility:** Validate observed events against tagging specification.

- Load tagging guide (CSV, JSON, or spec document)
- Compare expected vs. observed events
- Validate event parameters (required, forbidden, naming)
- Check GA4 event structure
- Detect duplicates and malformed payloads
- Score compliance (0–100%)

**Key files:**
- `src/rules/engine.ts` — Rule evaluation engine
- `src/rules/validators.ts` — Individual rule validators
- `src/rules/schemas.ts` — Zod schemas for validation
- `config/rules/` — Rule definitions

**Inputs:** Normalized events, tagging specification, rules config
**Outputs:** `ValidationResult[]` with findings, compliance score, risk flags

**Rule categories:**
- Coverage: required events present per page type
- Parameters: required params populated, forbidden params absent
- Naming: snake_case, length limits
- GA4 structure: event and parameter format
- Duplicates: same event fired multiple times

---

## Layer 6: Report

**Responsibility:** Transform audit + validation results into a branded PDF.

- Structure report sections (cover, scope, events, anomalies, appendix)
- Render HTML from templates with data
- Apply client branding (colors, logo, typography)
- Export to PDF via headless browser
- Preserve traceability (raw payloads, evidence)

**Key files:**
- `src/report/report-model.ts` — Report data structure
- `src/report/render-html.ts` — Template rendering (Handlebars or Nunjucks)
- `src/report/render-pdf.ts` — PDF export (headless Playwright)
- `src/report/assets.ts` — Branding asset management
- `templates/report.html` — Main template
- `config/branding/` — Client-specific branding

**Inputs:** Audit results, validation results, branding config
**Outputs:** `report.pdf`, `report.html`, `report.json`

---

## Data Flow

### Example: Audit a page for purchase event

```
1. Crawler finds /checkout URL
2. Browser opens /checkout
3. Capture intercepts dataLayer.push({ event: 'purchase', transaction_id: '123' })
4. Audit normalizes: { eventName: 'purchase', parameters: { transaction_id: '123' }, url: '/checkout', ... }
5. Rules check: Is transaction_id present? ✓ Is it required? ✓ GA4 format? ✓
6. Report documents: Purchase event detected on /checkout with transaction_id
```

### Edge case: SPA navigation

```
1. Browser opens /products
2. User clicks filter → React updates page without full reload
3. Capture intercepts new dataLayer.push({ event: 'view_item_list', ... })
4. Audit marks: triggeredBy: 'interaction', interactionContext: { type: 'click', selector: '#filter-size' }
5. Report sections events by interaction: "Click #filter-size → view_item_list"
```

---

## Key Architectural Decisions

1. **Separation of Concerns**
   - Each layer has one job; changes are isolated
   - Contract between layers is via types (see `src/core/types.ts`)

2. **Raw Data Preservation**
   - Browser observations are never discarded
   - Raw logs in `output/capture.json`
   - Normalization and deduplication in separate outputs
   - Traceability: every report finding links back to raw event

3. **Config-Driven Behavior**
   - Selectors for consent banners → `config/selectors/`
   - Validation rules → `config/rules/`
   - Client branding → `config/branding/`
   - No hardcoded rules; all logic is declarative

4. **Determinism & Observability**
   - All interactions are logged
   - Page load state is explicit (wait for network idle, custom ready event)
   - Errors don't silently fail; warnings are surfaced
   - Logs are structured and searchable

5. **Safety by Default**
   - Destructive interactions (forms, checkout, logout) are blocked
   - Only explicitly allowed interactions run
   - Consent handling is mandatory
   - Page mutation is never the goal

---

## Testing Strategy

- **Unit tests** → Individual validators, normalizers, rule engines
- **Integration tests** → Crawler → Browser → Capture flow on sandboxed URLs
- **E2E tests** → Full audit of test website, verify report output

Avoid mocking browser interactions; prefer test fixtures and sandboxed sites.

---

## Future Extensions

- **Multi-client support** → Load client rules/branding dynamically
- **Event recommendations** → Suggest missing standard events (page_view, view_item)
- **Historical comparison** → Track compliance over time
- **Custom metrics** → Allow agencies to define domain-specific events
- **API** → RESTful interface for audit + report generation
