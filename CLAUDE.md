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
├── src/
│   ├── crawler/          # Discovery & queueing
│   ├── browser/          # Playwright orchestration
│   ├── capture/          # dataLayer interception
│   ├── audit/            # Event normalization
│   ├── validation/       # Rule engine & checks
│   │   └── rules/        # Validation rule modules
│   ├── reporting/        # Report generation
│   └── types/            # Shared domain types
├── config/               # Site scope, rules, client branding
├── templates/            # HTML report templates
├── docs/                 # Architecture, decisions
├── output/               # Generated artifacts (never commit)
├── .env.example          # Template for required env vars
└── CLAUDE.md             # This file
```

---

## When Adding Features

1. Understand which layer(s) are affected
2. Inspect related types, config, and tests
3. Propose the smallest robust implementation
4. Implement in isolation (single concern)
5. Add or update tests to cover the change
6. Verify the CLI/report behavior works end-to-end
7. Update architecture docs if the change affects future work
