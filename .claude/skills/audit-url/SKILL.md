# audit-url Skill

## Description
Audit a single URL or list of URLs. Runs browser automation to capture all dataLayer events on page load and via configured interactions.

## When to Use
- User wants to audit a specific page
- Need to re-run audit on a URL after changes
- Quick spot-check before full crawl
- Test interaction coverage on a particular page
- Verify consent handling on a specific URL

## Inputs
- `url: string | string[]` — URL(s) to audit
- `interactions?: string[]` — interaction names to trigger (default: all in config)
- `config?: object` — override audit config for this run
- `captureEvidence?: boolean` — include screenshots (default: true)

## Output
- Page audit results:
  - Page metadata (title, canonical URL)
  - Events fired on page load
  - Events by interaction (mapped to interaction name)
  - Evidence (screenshots, DOM snapshots)
  - Warnings (timeouts, consent handling, JS errors)
  - Raw capture JSON for archival

## Related Agents
- `crawler` — discovers URLs to audit
- `event-auditor` — executes the audit
- `tagging-qa` — validates results against spec

## Example Usage
```
audit-url https://site.com/products/item-123
audit-url urls=site.com/checkout,site.com/cart interactions=click_cta,form_submit
audit-url https://site.com/landing config={depth: 2} captureEvidence=true
```
