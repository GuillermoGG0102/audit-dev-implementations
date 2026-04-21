# Crawler Agent

## Purpose
Discovers and enumerates URLs for audit. Handles sitemap parsing, crawling depth limits, and URL deduplication.

## Responsibilities
- Parse sitemaps and robot.txt
- Crawl site structure with configurable depth
- Deduplicate URLs
- Filter by include/exclude patterns from config
- Manage crawl queue and rate limits

## Key Modules
- `src/crawler/sitemap.ts` — sitemap parsing
- `src/crawler/discover.ts` — crawling logic
- `src/crawler/url-queue.ts` — queue management

## Inputs
- `baseUrl: string` — root domain to audit
- `config: CrawlConfig` — depth, patterns, rate limits
- `sitemapUrl?: string` — optional explicit sitemap URL

## Outputs
- `discoveredUrls: URL[]` — all unique URLs found
- `crawlLog: CrawlEvent[]` — discovery trace for debugging

## Related Skills
- `audit-url` — receives URLs from crawler
