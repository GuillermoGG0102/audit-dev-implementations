# dl-auditor

Automated dataLayer auditing tool for analytics QA. Audits websites to detect `dataLayer.push` events across URLs and user interactions, then produces branded PDF reports for analysts and stakeholders.

## What It Does

- **Discovers** URLs on a site via sitemaps or crawling
- **Opens** each URL in a browser and captures all `dataLayer.push` events
- **Triggers** safe user interactions (clicks, filters, pagination) to observe event firing
- **Validates** observed events against a tagging specification
- **Generates** branded PDF reports with findings, anomalies, and evidence

## Quick Start

```bash
npm install
npm run build
npm run audit -- --url https://example.com --depth 2
```

This will audit example.com and output results to `output/`.

## Architecture

See [CLAUDE.md](./CLAUDE.md) for full architecture details. The tool is organized into six layers:

1. **Crawler** — URL discovery and queueing
2. **Browser** — Playwright automation and consent handling
3. **Capture** — dataLayer interception and evidence collection
4. **Audit** — Event normalization and DOM context
5. **Rules** — Validation engine and tagging spec comparison
6. **Report** — PDF generation and client branding

## Project Structure

```
src/
├── cli/              # Command-line interface
├── core/             # Types, logging, config, errors
├── crawler/          # URL discovery
├── browser/          # Playwright automation
├── capture/          # Event and evidence capture
├── audit/            # Event normalization
├── rules/            # Validation engine
├── report/           # PDF generation
└── utils/            # Utilities

config/
├── default.audit.yaml      # Base audit config
├── rules/                  # Rule definitions (GA4, agency standard)
├── selectors/              # Consent/interaction selectors
└── branding/               # Client branding assets

.claude/
├── agents/          # Agent definitions
└── skills/          # Skill implementations
```

## Configuration

- **Audit config:** `config/default.audit.yaml` (URLs, depth, interactions)
- **Validation rules:** `config/rules/` (GA4, agency-specific)
- **Branding:** `config/branding/` (colors, logo, fonts)
- **Selectors:** `config/selectors/` (consent banners, interactions)

## Development

```bash
npm run dev          # Watch mode
npm test             # Run tests
npm run lint         # ESLint
npm run format       # Prettier
```

## Testing

```bash
npm test             # All tests
npm test -- src/     # Unit tests only
npm test -- --grep "pattern"  # Specific tests
```

## Output

Audit results are saved to `output/{timestamp}/`:

- `capture.json` — Raw browser observations
- `audit.json` — Normalized event data
- `screenshots/` — Evidence and page state
- `report.pdf` — Final branded report

## Non-Negotiable Principles

1. **Event traceability** — Never guess events; only report what was observed
2. **Evidence-based** — Every finding includes URL, timestamp, payload, and proof
3. **Config-driven** — No hardcoded rules; all business logic is configurable
4. **Browser-based** — Prefer reproducible automation over static analysis
5. **Client-ready** — Reports are professional, structured, and agency-grade

## Documentation

- [CLAUDE.md](./CLAUDE.md) — Full architecture and coding guidance
- `docs/architecture.md` — Technical architecture deep-dive
- `docs/audit-spec.md` — Audit execution specification
- `docs/event-taxonomy.md` — Event naming and GA4 structure
- `docs/roadmap.md` — Future features and improvements

## License

MIT
