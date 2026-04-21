# name: inspect-datalayer
description: Analyze a specific dataLayer event captured during audit.
  Use when user wants to understand event structure, parameters, timing,
  or needs to validate event compliance.

# Inspect dataLayer Event Skill

Provides deep analysis of a specific dataLayer event or event group from audit results.

## What
Examine event structure, parameters, frequency, and GA4 compatibility.

## When to Use
- User wants to understand why a specific event fired
- Need to trace event origin (page load vs interaction)
- Validate event parameters against GA4 spec
- Compare similar events across URLs
- Debug event sequence or timing issues

## Steps

1. **Locate the event** in audit JSON
   - Find event by name: `eventName: "purchase"`
   - Filter by URL if specified
   - Identify all occurrences

2. **Analyze structure**
   - Event name and payload
   - Parameter types (string, number, array, object)
   - Which parameters are always present
   - Which vary across observations

3. **Check GA4 compliance**
   - Event name: `^[a-z_]+$`, max 40 chars
   - Parameters: reserved GA4 names (transaction_id, value, currency)
   - Check for PII (email, phone, ssn) — flag if present

4. **Report findings**
   - Event signature with required/optional params
   - Frequency and distribution across URLs
   - Any GA4 violations or risks
   - Recommendations for fixing

## Example Output

```
Event: purchase
Observed: 12 times across 3 URLs

Parameters:
✓ transaction_id (string, always present)
✓ value (number, always present)
✓ currency (string, always present)
? items (array, present in 10/12 observations)
✗ customer_email (string, PII risk)

GA4 Status: Mostly compliant
Recommendation: Remove customer_email parameter
```
