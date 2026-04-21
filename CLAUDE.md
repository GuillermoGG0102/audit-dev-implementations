# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product Overview

This repository builds an **automated dataLayer auditing tool for analytics QA**. The tool audits websites to detect `dataLayer.push` events across URLs and user interactions, then produces a branded PDF report for analysts and stakeholders. It reduces manual review time for analytics teams working with GTM and GA4.

Key non-negotiable principles:
- Do not guess events if they were not observed
- Prefer reproducible browser-based evidence over static code assumptions
- Every reported event must be traceable to URL, interaction, raw payload, timestamp, and evidence
- Keep business rules separate from browser automation logic
- Reports must be client-facing and agency-ready

---

## Tech Stack & Development Commands

**Stack:** TypeScript, Node.js, Playwright, Vitest/Jest, HTML/CSS → PDF

**Common commands** (add to package.json scripts as features are built):
```bash
npm run dev        # Start development (watch mode)
npm test           # Run all tests
npm test -- --ui   # Run tests with UI
npm run test:unit  # Unit tests only
npm run test:e2e   # E2E/integration tests (may require setup)
npm run lint       # ESLint check
npm run format     # Prettier format
npm run build      # TypeScript compilation
npm run audit      # Run the audit tool on a test site
```

**Single test runs:**
```bash
npm test -- src/myfeature.test.ts
npm test -- --grep "pattern"
```

---

## Architecture: Six Layers

The codebase is organized around these concerns (kept strictly separated):

### 1. **Crawling & Discovery** (`src/crawler/`)
- Find pages to audit
- Manage queue, depth, deduplication
- Config-driven scope (URLs, depth limits, include/exclude patterns)

### 2. **Browser Automation** (`src/browser/`)
- Open pages via Playwright
- Handle consent banners (config-driven)
- Trigger safe interactions (clicks, filters, pagination)
- Observe SPA navigations
- **Safety first:** Default-block destructive actions (forms, checkout, logout)

### 3. **Data Capture** (`src/capture/`)
- Intercept and record `dataLayer.push` calls
- Capture console/network evidence when useful
- Snapshot DOM metadata for context (page title, URL at event time)

### 4. **Audit Normalization** (`src/audit/`)
- Convert raw browser observations into stable domain models
- Associate event ↔ URL ↔ interaction
- Deduplicate only in normalized views, never drop raw logs
- Preserve event order and timing

### 5. **Rule Validation** (`src/validation/`)
- Check expected vs observed events
- Validate naming conventions, required params, GA4 structure
- Flag duplicates and malformed payloads
- **Rules are config-driven**, not hardcoded

### 6. **Reporting** (`src/reporting/`)
- Generate structured report data from audit
- Render HTML templates
- Export branded PDF
- Include cover, scope, URLs, events by URL/interaction, anomalies, appendix

---

## Config & Rules

- **Config path:** `/config` — site scope, interaction allowlist, consent banner selectors, client branding
- **Rule modules:** `/src/validation/rules/` — event validation rules
- **Templates:** `/templates/` — HTML report templates
- **Environment:** `.env.example` lists required vars; never commit `.env` with secrets

Client-specific selectors and business rules belong in config files, not hardcoded in scripts.

---

## Output Structure

- **Raw capture:** `/output/{run-id}/capture.json` — unmodified browser observations
- **Normalized audit:** `/output/{run-id}/audit.json` — structured event data
- **Evidence:** `/output/{run-id}/screenshots/` — page state at event time
- **Final PDF:** `/output/{run-id}/report.pdf` — branded deliverable

Never commit `/output/` as source-of-truth.

---

## Safe Interaction Policy

**Default allowed:**
- Navigation links, tabs, accordions, modals, filters, sort, pagination

**Default blocked** (unless explicitly enabled in config):
- Real purchases, payments, lead forms, account creation/deletion, logout, irreversible mutations

The `src/browser/interaction.ts` module enforces this policy.

---

## Event Capture & Validation

**Always capture:**
- Raw `dataLayer.push` payload
- Event order and timing
- Whether triggered by page load or user interaction
- DOM context for the triggering element (selector, text, attributes)

**Never deduplicate in raw logs.** Deduplication happens only in normalized audit output.

**Validation rules** are declarative and live in config or `/src/validation/rules/`. Examples:
- `required_events_by_page_type`
- `required_params_by_event_name`
- `forbidden_parameters`
- `naming_conventions`
- `ga4_mapping_checks`

---

## Key Architectural Decisions

1. **Event traceability is non-negotiable.** Always preserve raw payloads and DOM context.
2. **Config-driven behavior.** Client rules, site scope, interaction allowlists — all config, never inline.
3. **Determinism & observability.** All interactions must be reproducible; logs must be inspectable.
4. **Separation of concerns.** Crawler, browser, capture, normalization, validation, and reporting are distinct modules with clear boundaries.
5. **Browser-based evidence over static assumptions.** If a dataLayer event wasn't observed during audit, don't report it.

---

## Coding Style & Patterns

- **Type safety:** Explicit types over implicit objects
- **Small modules:** Prefer composable, single-responsibility modules
- **Comments:** Only where they clarify intent or non-obvious constraints; don't repeat what code already expresses
- **Avoid premature abstraction:** Three similar lines is better than an abstraction built for hypothetical future use

---

## Testing Strategy

- **Unit tests:** `src/**/*.test.ts` — test individual modules in isolation
- **Integration tests:** `src/**/*.integration.test.ts` — test data flow between layers
- **E2E tests:** `e2e/**/*.test.ts` — test against real sites or sandboxed URLs

When debugging:
1. Isolate which layer is affected (discovery, interaction, capture, normalization, validation, reporting)
2. Fix the root cause
3. Add regression coverage

---

## Documentation

- **Architecture changes:** Document in `docs/architecture.md` or `docs/decisions.md`
- **Public types:** Keep stable unless there's a strong reason to change
- **Test behavior changes together:** Update tests when behavior changes

---

## Definition of Done

A feature is done when:
- Code compiles with no TypeScript errors
- All tests pass (unit + relevant integration/e2e)
- Logs are clear and inspectable (use structured logging)
- Output artifacts are usable (JSON is valid, PDF renders correctly)
- Architecture changes are documented if they affect future work
- The feature helps analysts complete work faster (is it solving a real problem?)

---

## Repository Conventions

```
dl-auditor/
├─ CLAUDE.md                           # Guidance for Claude Code
├─ README.md                           # Project overview
├─ package.json                        # Dependencies and scripts
├─ tsconfig.json                       # TypeScript configuration
├─ .gitignore                          # Git ignore rules
├─ .env.example                        # Environment variables template

├─ .claude/                            # Claude Code configuration
│  ├─ settings.json                    # Project settings, agents, skills
│  ├─ agents/                          # Agent implementations
│  │  ├─ crawler.md
│  │  ├─ event-auditor.md
│  │  ├─ tagging-qa.md
│  │  └─ report-writer.md
│  └─ skills/                          # Skill implementations
│     ├─ inspect-datalayer/SKILL.md
│     ├─ audit-url/SKILL.md
│     ├─ validate-tagging-guide/SKILL.md
│     └─ build-pdf-report/SKILL.md

├─ config/                             # Audit config, rules, branding
│  ├─ default.audit.yaml               # Base audit configuration
│  ├─ selectors/
│  │  └─ generic.yaml                  # Consent & interaction selectors
│  ├─ rules/
│  │  ├─ ga4.yaml                      # GA4 validation rules
│  │  └─ agency-standard.yaml          # Custom rules per-client
│  └─ branding/
│     ├─ theme.json                    # Colors, typography, spacing
│     ├─ cover.html                    # PDF cover template
│     └─ report.css                    # Report styling

├─ src/                                # Main application code
│  ├─ cli/
│  │  └─ index.ts                      # Command-line interface
│  ├─ core/                            # Core utilities
│  │  ├─ types.ts
│  │  ├─ logger.ts
│  │  ├─ config.ts
│  │  └─ errors.ts
│  ├─ crawler/                         # URL discovery
│  │  ├─ sitemap.ts
│  │  ├─ discover.ts
│  │  └─ url-queue.ts
│  ├─ browser/                         # Playwright automation
│  │  ├─ launch.ts
│  │  ├─ consent.ts
│  │  ├─ hooks.ts
│  │  └─ interaction-runner.ts
│  ├─ capture/                         # Event & evidence capture
│  │  ├─ datalayer-observer.ts
│  │  ├─ network-observer.ts
│  │  ├─ console-observer.ts
│  │  └─ dom-snapshot.ts
│  ├─ audit/                           # Audit normalization
│  │  ├─ page-audit.ts
│  │  ├─ interaction-audit.ts
│  │  ├─ normalizer.ts
│  │  └─ evidence.ts
│  ├─ rules/                           # Rule engine & validators
│  │  ├─ engine.ts
│  │  ├─ validators.ts
│  │  └─ schemas.ts
│  ├─ report/                          # PDF generation
│  │  ├─ report-model.ts
│  │  ├─ render-html.ts
│  │  ├─ render-pdf.ts
│  │  └─ assets.ts
│  └─ utils/                           # Utility functions
│     ├─ urls.ts
│     ├─ selectors.ts
│     └─ sanitize.ts

├─ templates/                          # HTML report templates
│  ├─ report.html
│  └─ partials/

├─ tests/
│  ├─ unit/                            # Unit tests
│  ├─ integration/                     # Integration tests
│  └─ fixtures/                        # Test data and mocks

├─ output/                             # Generated artifacts (never commit)
│  ├─ json/
│  ├─ screenshots/
│  └─ pdf/

└─ docs/                               # Architecture documentation
   ├─ architecture.md
   ├─ audit-spec.md
   ├─ event-taxonomy.md
   └─ roadmap.md
```

---

## Report Templates & Design

Reports are client-facing deliverables. Template styling must be professional and brand-consistent.

### HTML & PDF Standards
- **Report template location:** `/templates/report.html` (renders to PDF via headless browser)
- **Style delivery:** Inline CSS only (no external stylesheets) for reliable PDF output
- **Typography:** Pair a serif or display font for headings with a clean sans-serif for body (generous 1.6–1.7 line-height for readability)
- **Colors:** Never use default grays. Derive from client brand palette stored in `/config/{client}/branding.json` or `/assets/brand/colors.json`
- **Spacing:** Use intentional token-based spacing (consistent gutters, predictable padding)
- **Layering:** Use subtle shadows and borders to distinguish sections from one another
- **Images:** Apply gradient overlays and color treatments (e.g., `mix-blend-multiply`) for a polished look

### Brand Assets
- Check `/assets/brand/` for logo, color guide, and typography rules
- Check `/assets/logos/` for company/client logos to include in reports
- If a logo exists, use it instead of placeholders
- If a color palette is defined, use exact hex values — do not invent brand colors
- Store client-specific branding in `/config/{client-name}/branding.json` (colors, font URLs, logo path)

### Testing Report Output
- Use a local Node.js server to render and inspect templates before PDF export: `node serve.mjs` (serves from project root on `http://localhost:3000`)
- Check report in browser first: spacing, alignment, font rendering, color accuracy
- Test PDF export and verify:
  - Page breaks are in the right places (no orphaned headers/footers)
  - Images render sharply
  - Tables don't bleed off the page
  - Colors print as expected

### Report Sections
Every final report must include:
- **Cover page** — client name, audit scope, date, agency branding
- **Executive summary** — key findings, metrics, risk highlights
- **Scope** — URLs audited, depth, date range, interaction types tested
- **Detected events by URL** — table: page URL → events observed with timestamps
- **Detected events by interaction** — table: interaction → event name → parameters
- **Anomalies & risks** — validation failures, duplicates, missing required events, malformed payloads
- **Appendix** — raw `dataLayer` payloads, DOM context, screenshots

### Anti-Generic Design Guardrails (Reports)
- **Do not use default colors.** Derive from client brand or audit tool's brand.
- **Do not use flat shadows.** Use layered, color-tinted shadows with low opacity for depth.
- **Do not use generic typography.** Pair font families intentionally; apply tight tracking on large headings, generous line-height on body.
- **Do not overcrowd.** Leave white space; break complex data into smaller tables or sections.
- **Tables & lists must be scannable.** Use striped rows, clear headers, consistent alignment.
- **Evidence must be prominent.** Screenshots and raw payloads are trust-builders; don't bury them.

---

## When Adding Features

1. Understand which layer(s) are affected
2. Inspect related types, config, and tests
3. Propose the smallest robust implementation
4. Implement in isolation (single concern)
5. Add or update tests to cover the change
6. Verify the CLI/report behavior works end-to-end
7. Update architecture docs if the change affects future work
