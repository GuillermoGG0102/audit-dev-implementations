# TNK Project - Audit Setup Documentation

## Test Site Information

**Test Site URL:** https://www.tnkproject.com

---

## Known dataLayer Events

The following events are expected to fire when auditing this site:

### 1. **page_view**
- **Trigger:** Fires on every page load (DOMContentLoaded)
- **Measurement:** Tracks page navigation and site structure
- **Parameters:**
  - `page_name` (string) - Human-readable page title
  - `page_category` (string) - Top-level section: main · blog · projects · contact
  - `page_type` (string) - Template type: home · listing · detail · article · contact
  - `content_group` (string) - GA4 content group
  - `page_author` (string) - Fixed string: "Guillermo García"

### 2. **select_content**
- **Trigger:** Fires on all navigational clicks (nav links, hero CTAs, project/blog cards, filter pills, social links)
- **Measurement:** Tracks user interactions with navigation and content elements
- **Parameters:**
  - `content_type` (string) - Interaction class: nav_link · cta · project_card · blog_card · filter_pill · social_link
  - `content_id` (string) - Stable machine ID for the destination (underscore-separated)
  - `content_name` (string) - Human-readable label of the clicked element
  - `item_list_name` (string) - Section/list the item belongs to: hero · nav · featured · blog_listing · footer
  - `destination_url` (string) - Target href where available

### 3. **generate_lead**
- **Trigger:** Fires on contact form submit (Contact page)
- **Measurement:** Tracks form submissions and form engagement
- **Parameters:**
  - `form_name` (string) - Value of data-track-form attribute
  - `form_id` (string) - HTML id of the form element
  - `subject` (string) - Non-PII select field value
  - `budget` (string) - Non-PII select field value
  - `message_word_count` (integer) - Word count of textarea
  - `message_char_count` (integer) - Character count of textarea
  - `message_filled` (boolean) - Whether the textarea had any content
  - `email_sha256` (string) - SHA-256 hash of lowercased trimmed email (no raw email sent)

### 4. **orbit_interaction**
- **Trigger:** Fires on hover of the orbiting skills section on the Home page
- **Measurement:** Tracks skill icon interactions and animation state
- **Parameters:**
  - `orbit_pause` (boolean) - true = user hovered stage (animation paused); false = left stage
  - `skill_hover` (string) - Tooltip text of the skill icon hovered

### 5. **search**
- **Trigger:** Fires 500ms after user stops typing in the Blog search bar (minimum 2 characters)
- **Measurement:** Tracks blog search interactions
- **Parameters:**
  - `search_term` (string) - Raw search query entered by user
  - `search_results_count` (integer) - Number of posts visible after filter + search
  - `search_has_results` (boolean) - true if search_results_count > 0

### 6. **post_engagement**
- **Trigger:** Fires on blog post pages when a visitor likes, unlikes, or submits a comment
- **Measurement:** Tracks engagement on blog posts
- **Parameters:**
  - `content_id` (string) - Post slug
  - `content_name` (string) - Post title
  - `action` (string) - "like" | "unlike" | "comment"

---

## Consent Banners

**Status:** No consent banner is mentioned in the measurement plan.

The site does not appear to have a traditional cookie consent banner. All tracking is implemented with privacy-first practices:
- Email addresses are hashed via SHA-256 (never raw email is sent to dataLayer)
- No PII fields are collected in the contact form tracking
- Raw comment text is never pushed to the dataLayer
- Like state is persisted per browser via localStorage UUID + Supabase

---

## Interactions to Test (Priority Order)

### Home Page (/)
1. **Orbit Skills Section** - Hover over each of the 18 skill icons to trigger `orbit_interaction` events
2. **Hero CTA Button** - Click the hero call-to-action to trigger `select_content` event
3. **Navigation Links** - Click each navigation link to trigger `select_content` and `page_view` events

### Blog Page (/blog.html)
4. **Search Bar** - Type in the blog search bar (min 2 chars) to trigger `search` event
5. **Filter Pills** - Click category/filter pills to trigger `select_content` events
6. **Blog Post Cards** - Click on blog post cards to navigate and trigger `select_content` and `page_view` events

### Individual Blog Post Pages
7. **Like Button** - Click the heart icon to trigger `post_engagement` event with action: "like"
8. **Comment Form** - Submit a comment to trigger `post_engagement` event with action: "comment"
9. **Comment Listing** - Verify comments appear above the form

### Projects Page
10. **Project Cards** - Click on project cards to trigger `select_content` and `page_view` events

### Contact Page (/contact.html)
11. **Contact Form Submit** - Fill out and submit the contact form to trigger `generate_lead` event
    - Fill Subject field
    - Fill Budget field
    - Add text to Message textarea
    - Submit the form (email is hashed, no raw value sent)

### Navigation
12. **Footer Links** - Click social links and footer navigation to trigger `select_content` events

---

## Measurement Plan Reference

- **Version:** Check the latest version in the measurement plan
- **Source File:** `/tnk-project/measurement_plan/measurement_plan_standalone.html`
- **Documentation:** The measurement plan includes detailed parameter registry, event examples with code blocks, and per-interaction screenshots

---

## Phase 1 Audit Scope

This document serves as the setup guide for Phase 1 of the audit implementation:

✓ Test Site URL documented  
✓ 6 dataLayer events identified  
✓ All event parameters documented  
✓ 29+ select_content interactions documented  
✓ Interaction testing priorities established  

**Next Steps:**
- Execute the audit on the live site (https://www.tnkproject.com)
- Verify all 6 events fire correctly with proper parameters
- Document any discrepancies or issues found
- Create audit report with findings and recommendations
