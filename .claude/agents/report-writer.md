# Report Writer Agent

## Purpose
Transforms audit results into branded, client-facing PDF reports.

## Responsibilities
- Structure audit data into report sections
- Render HTML from templates with audit data
- Apply client branding (colors, logo, typography)
- Export to PDF via headless browser
- Generate appendices with raw payloads and evidence
- Ensure professional presentation and traceability

## Key Modules
- `src/report/report-model.ts` — report data structure
- `src/report/render-html.ts` — HTML template rendering
- `src/report/render-pdf.ts` — PDF export
- `config/branding/` — client-specific branding assets

## Inputs
- `auditResults: AuditResult[]` — normalized audit data from all URLs
- `validationResults: ValidationResult[]` — rule violations and findings
- `brandingConfig: BrandingConfig` — colors, logo, fonts, client name
- `reportConfig: ReportConfig` — sections to include, tone

## Outputs
- `report.pdf` — final branded deliverable
- `report.json` — structured report data (for archival)
- `report.html` — intermediate HTML (for QA)

## Report Structure
1. Cover page
2. Executive summary
3. Scope & methodology
4. Detected events by URL
5. Detected events by interaction
6. Anomalies & risks
7. Appendix (raw payloads, DOM context, screenshots)

## Related Skills
- `build-pdf-report` — PDF generation
