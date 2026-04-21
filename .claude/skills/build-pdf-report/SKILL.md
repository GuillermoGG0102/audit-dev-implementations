# name: build-pdf-report
description: Generate a branded PDF report from audit and validation results.
  Use when audit and validation are complete, or when user needs
  to re-render report with different branding.

# Build PDF Report Skill

Transform audit data and validation findings into a professional PDF report.

## What
Render audit results into branded HTML/PDF with cover, scope, events, risks, and appendix.

## When to Use
- Audit and validation are complete, ready for final report
- User wants to regenerate report with different branding
- Export for client or stakeholder
- Create multiple client reports from same audit data
- Preview report structure before PDF

## Steps

1. **Prepare report data**
   - Gather audit results (events, evidence, metadata)
   - Gather validation results (compliance score, risks, recommendations)
   - Load client branding config (colors, logo, typography)
   - Verify all data is complete

2. **Render HTML from template**
   - Populate cover page (client name, date, audit scope)
   - Build executive summary (compliance score, risk count)
   - Create event tables (by URL, by interaction)
   - Format anomalies and risk flags with severity
   - Add appendix with raw payloads and screenshots
   - Apply client branding (colors, logo, fonts)

3. **Export to PDF**
   - Render HTML in headless browser
   - Verify page breaks don't orphan sections
   - Check colors, images, tables render correctly
   - Save to `output/pdf/{timestamp}.pdf`

4. **Verify output**
   - PDF is readable and professional
   - All evidence (screenshots) is included
   - No broken links or missing content
   - Report file is provided to user

## Output

- `report.pdf` — Final client-facing deliverable
- `report.html` — Intermediate HTML (for QA, archival)
- `report.json` — Structured data (for programmatic use)

Report includes:
- Cover, executive summary, scope
- Event tables (by URL, interaction)
- Anomalies and risk recommendations
- Appendix with raw payloads and evidence
