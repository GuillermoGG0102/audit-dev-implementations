# inspect-datalayer Skill

## Description
Deep inspection and analysis of a specific dataLayer event or set of events. Useful for understanding event structure, parameters, timing, and relationship to DOM elements or user actions.

## When to Use
- User wants to understand why a specific event fired
- Need to trace event origin (page load vs. interaction)
- Validate event parameters against GA4 spec
- Compare similar events across different URLs
- Debug event sequence or timing issues

## Inputs
- `eventName: string` — event name to inspect
- `eventPayload?: object` — specific payload to analyze
- `urls?: URL[]` — filter to specific URLs where event occurred
- `context?: string` — additional context (e.g., "ecommerce checkout flow")

## Output
- Structured analysis of event:
  - Event signature (name, common parameters)
  - Observed frequency and distribution
  - Parameter analysis (required, optional, unexpected values)
  - GA4 compatibility assessment
  - DOM/interaction context where applicable
  - Recommendations for compliance

## Related Agents
- `event-auditor` — captures events
- `tagging-qa` — validates against spec

## Example Usage
```
inspect-datalayer eventName=purchase context=checkout
inspect-datalayer eventName=add_to_cart urls=https://site.com/products/*
```
