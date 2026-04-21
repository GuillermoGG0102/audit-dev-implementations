# validate-tagging-guide Skill

## Description
Load and validate a tagging guide or measurement specification against audit results. Allows manual override of rules, custom validation, and compliance scoring.

## When to Use
- User has a specific tagging guide (CSV, JSON, PDF spec document)
- Need to validate audit against client's measurement plan
- Custom event naming conventions or requirements
- GA4 vs. GTM differences for specific client
- Manual override or exception for business logic

## Inputs
- `guideFile: string` — path or URL to tagging guide
- `guideFormat: "csv" | "json" | "spec"` — format of guide
- `auditResults: AuditResult[]` — audit data to validate against
- `strictMode?: boolean` — fail on missing optional events (default: false)
- `overrides?: ValidationOverride[]` — manual rule overrides

## Output
- Validation report:
  - Compliance score (0-100%)
  - Per-page event coverage
  - Per-interaction event coverage
  - Missing events by type
  - Parameter mismatches
  - Risk flags for report highlight
  - Exceptions and overrides applied

## Validation Types
- **Coverage:** required events present
- **Parameters:** required params populated correctly
- **Naming:** event names match spec
- **GA4 structure:** event/parameter format for GA4 compatibility
- **Exclusions:** forbidden parameters not present

## Related Agents
- `tagging-qa` — enforces rules
- `report-writer` — includes validation in final report

## Example Usage
```
validate-tagging-guide guideFile=client-tagging-spec.csv guideFormat=csv
validate-tagging-guide guideFile=measurement-plan.json strictMode=true
validate-tagging-guide guideFile=spec.json overrides=[{event: custom_purchase, isRequired: false}]
```
