# name: audit-url
description: Run browser audit on a single URL or small set of URLs.
  Use when user wants to spot-check a page, test after changes,
  or verify a specific URL's dataLayer implementation.

# Audit Single URL Skill

Execute a focused dataLayer audit on one or more URLs without full crawl.

## What
Capture all dataLayer events (page load + interactions) for a URL and return normalized results.

## When to Use
- User wants quick audit of specific page
- Re-run audit after code changes
- Verify a particular URL works
- Test interaction coverage
- Debug consent handling on specific page

## Steps

1. **Prepare the audit**
   - Get URL(s) from user
   - Load audit config (default or override)
   - Validate URL format (must be absolute HTTPS)

2. **Open page in browser**
   - Launch Playwright (headless)
   - Navigate to URL, wait for network idle
   - Handle any consent banners per config

3. **Capture page load events**
   - Intercept all dataLayer.push on page load
   - Record timestamp, payload, DOM context
   - Wait for settleTimeout (default: 3000ms) for late-fired events
   - Take screenshot of page

4. **Run interactions** (if configured)
   - For each allowed interaction:
     - Execute (click, scroll, form input, etc.)
     - Wait for new dataLayer events
     - Record which interaction triggered events
     - Screenshot result state

5. **Return results**
   - Normalized events with metadata
   - Raw capture JSON (for archival)
   - Screenshots as evidence
   - Any warnings (timeouts, errors)

## Example

User: "audit https://example.com/checkout"

Output:
```
Page: https://example.com/checkout
Events on load: page_view, view_cart
Events on interaction "click_button_checkout":
  - initiate_checkout
  - add_payment_info
Warnings: None
Screenshots: 2 (page load, after click)
```
