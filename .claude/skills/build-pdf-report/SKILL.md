# build-pdf-report Skill

## Description
Generate a branded, client-facing PDF report from audit and validation results.

## When to Use
- Ready to export final deliverable
- Need to regenerate report with updated branding
- Create multiple reports for different clients from same audit
- Preview report in HTML before PDF
- Custom report sections or structure

## Inputs
- `auditResults: AuditResult[]` — normalized audit data
- `validationResults: ValidationResult[]` — rule validation findings
- `brandingConfig: BrandingConfig` — client name, logo, colors, fonts
- `reportConfig?: ReportConfig` — sections to include, tone, appendix depth
- `outputPath?: string` — where to save PDF (default: output/pdf/{timestamp}.pdf)
- `includeRawPayloads?: boolean` — include raw dataLayer JSON in appendix (default: true)

## Output
- **report.pdf** — final client-facing deliverable
- **report.html** — intermediate HTML (for QA and archival)
- **report.json** — structured report data (for programmatic use)

## Report Sections (Standard)
1. Cover page (client name, scope, audit date)
2. Executive summary (key findings, risk highlights)
3. Scope & methodology (URLs audited, depth, interactions tested)
4. Events by URL (table: URL → events observed)
5. Events by interaction (table: interaction type → events)
6. Anomalies & risks (validation failures, duplicates, missing events)
7. Appendix (raw payloads, DOM context, evidence screenshots)

## Branding Customization
- Client colors (primary, secondary, accent)
- Logo placement (cover, header)
- Typography (heading font, body font, weights)
- Report tone (technical, executive, summary)

## Related Agents
- `report-writer` — executes report generation
- `tagging-qa` — provides validation data for report

## Example Usage
```
build-pdf-report auditResults=... validationResults=... brandingConfig=acme-corp
build-pdf-report auditResults=... brandingConfig=... reportConfig={tone: executive, appendixDepth: minimal}
build-pdf-report auditResults=... includeRawPayloads=true outputPath=output/pdf/custom-report.pdf
```
