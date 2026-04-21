# name: validate-tagging-guide
description: Validate audit results against a tagging specification or guide.
  Use when user provides a measurement spec, compliance requirements,
  or custom validation rules.

# Validate Against Tagging Guide Skill

Compare observed dataLayer events against an expected specification (tagging guide).

## What
Load tagging spec, check observed events match requirements, score compliance, flag risks.

## When to Use
- User has a tagging guide or measurement spec
- Need to validate audit against client requirements
- Check GA4 event naming or structure
- Score compliance percentage
- Identify missing or malformed events

## Steps

1. **Load tagging guide**
   - Accept CSV, JSON, or spec document
   - Parse expected events and parameters
   - Extract naming rules, required fields, restrictions

2. **Compare with audit results**
   - For each expected event:
     - Is it present in audit? ✓ / ✗
     - If present, is it on correct page type?
     - Do parameters match (required, forbidden, types)?
   - For each observed event:
     - Is it in the spec?
     - Flag if unexpected event (may be custom)

3. **Check compliance rules**
   - Event naming: `^[a-z_]+$`, max length
   - GA4 reserved params (transaction_id, value, currency)
   - Forbidden params (PII: email, phone, ssn)
   - Required params per event type

4. **Score and report**
   - Compliance %: (events matching / expected) * 100
   - Missing events (required but not observed)
   - Parameter issues (type mismatch, extra params)
   - Risk flags (critical, high, medium, low)
   - Recommendations for remediation

## Example Output

```
Tagging Guide: GA4 E-Commerce Standard
Compliance Score: 85%

✓ page_view (observed on all pages)
✓ view_item (observed on product pages)
✗ purchase (expected but NOT observed)
⚠ add_to_cart (missing currency parameter)

Missing Events: purchase
Parameter Issues: 2
Risk Flags: 1 high, 2 medium

Recommendation: Implement purchase event on checkout completion
```
