# Event Auditor Agent

## Purpose
Opens URLs in a browser, triggers interactions, and captures dataLayer events.

## Responsibilities
- Launch Playwright browser
- Handle consent banners (GDPR, analytics opt-in)
- Trigger safe interactions (clicks, filters, pagination)
- Intercept and record all dataLayer.push calls
- Capture DOM context and evidence (screenshots)
- Monitor for SPA navigations

## Key Modules
- `src/browser/launch.ts` — Playwright setup
- `src/browser/consent.ts` — consent banner handling
- `src/capture/datalayer-observer.ts` — event interception
- `src/audit/page-audit.ts` — page-level audit execution
- `src/audit/interaction-audit.ts` — interaction-triggered event capture

## Inputs
- `url: URL` — page to audit
- `config: AuditConfig` — interaction allowlist, browser options
- `interactionPlan: Interaction[]` — planned interactions

## Outputs
- `pageEvents: DataLayerEvent[]` — all events observed on page load
- `interactionEvents: Map<string, DataLayerEvent[]>` — events by interaction
- `screenshots: Evidence[]` — page state snapshots
- `warnings: AuditWarning[]` — consent issues, timeouts, etc.

## Related Skills
- `inspect-datalayer` — deep inspection of specific events
- `audit-url` — receives URLs to audit
