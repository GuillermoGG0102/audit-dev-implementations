# Tagging QA Agent

## Purpose
Validates observed events against a tagging guide or measurement specification.

## Responsibilities
- Load tagging guide (CSV, JSON, or spec document)
- Compare expected events against observed events
- Flag missing required events per page/interaction type
- Validate event parameters (required, forbidden, naming conventions)
- Check GA4 event structure compliance
- Detect duplicate or malformed payloads
- Generate audit findings and risk scores

## Key Modules
- `src/rules/engine.ts` — rule evaluation engine
- `src/rules/validators.ts` — individual rule validators
- `config/rules/` — rule definitions (GA4, agency standard)

## Inputs
- `auditResults: AuditResult[]` — observed events from auditor
- `taggingGuide: TaggingSpec` — expected events and parameters
- `ruleSet: RuleConfig[]` — validation rules to apply

## Outputs
- `validationResults: ValidationResult[]` — per-finding details
- `complianceScore: number` — 0-100 percent of events matching spec
- `riskFlags: RiskFlag[]` — critical issues for report highlight

## Rule Categories
- `required_events_by_page_type` — e.g., product detail page must have product_view
- `required_params_by_event_name` — e.g., purchase event requires transaction_id
- `forbidden_parameters` — e.g., don't send PII in dataLayer
- `naming_conventions` — snake_case event names, etc.
- `ga4_mapping_checks` — event structure for GA4 compatibility
- `duplication_checks` — same event fired multiple times

## Related Skills
- `validate-tagging-guide` — manual rule inspection and override
