# Contacts (master list)

The **Contacts** page is the master directory for volunteers, pastors, parents, and donors.

## monday.com setup

### Contacts board

Create or use a board (default name in sync script: `Contacts Test`). Required columns:

| Column title | Type | Notes |
|--------------|------|--------|
| Email | email | Primary match key |
| Alt Email | text/email | Secondary address(es) kept after merge (comma-separated) |
| Tags | status (multi-label) | Labels: `Volunteer`, `Pastor`, `Parents`, `Donor` (legacy `Parent` is read as Parents) |
| type | status/text | Legacy single-value column (still read if present) |
| Phone | phone | Optional; displayed in international format (`+1 555 123 4567`); writes use `{ phone, countryShortName }` JSON |
| Profile Photo | file | Optional |
| Passport Photo | file | Optional; shown in volunteer files panel |
| Files | file | Optional gallery; passport matched by filename |
| QuickBooks Customer ID | text | Optional; speeds financial lookup |
| Applications | board_relation | Links to Applications board items (one per term) |
| link to Current Service Ended | board_relation | Links to completed/past volunteer terms on the Current Service Ended board |
| Address, City, State, Zip, Country, Date of birth | text | Optional demographics |
| Pastor Name, Pastor Email, Pastor Phone, Church Name | text / email / phone | Optional; shown on volunteer contact detail |
| Pastor Reference | board_relation | Links to one or more pastor reference items on separate board (`link_to_pastors_reference7`); drill-down shows a picker when multiple are linked |
| Donations | board_relation | Links to donation items on Donations board (`link_to_donations`); also matched by Donor Email |

### Applications board

| Column | Purpose |
|--------|---------|
| Contact | board_relation → Contacts | Volunteer’s contact record |
| Email, Parent Email, Pastor Email | Link parent/pastor contacts by email |

## Environment

```bash
VITE_CONTACTS_BOARD_ID=your_contacts_board_id
# VITE_CONTACTS_BOARD_NAME=Contacts Test
# VITE_CONTACTS_COL_TAGS=Tags
# VITE_CONTACT_COL_PASTOR_NAME=Pastor Name
# VITE_CONTACT_COL_PASTOR_EMAIL=Pastor Email
# VITE_CONTACT_COL_PASTOR_PHONE=Pastor Phone
# VITE_CONTACT_COL_CHURCH=Church Name
# VITE_CONTACT_COL_PASTOR_REFERENCE_LINK=Pastor Reference
# VITE_CONTACT_COL_PASTOR_REFERENCE_LINK_ID=link_to_pastors_reference7
# VITE_APPLICATIONS_BOARD_ID=...  # required for relationship graph
# VITE_SERVICE_ENDED_BOARD_ID=5882671161
# VITE_CONTACT_COL_SERVICE_ENDED_LINK_ID=board_relation0
# VITE_CONTACT_COL_SERVICE_ENDED_LINK=link to Current Service Ended
# VITE_CONTACT_COL_APPLICATIONS=Volunteer Service - Short Term
```

Use `VITE_USE_MOCK_DATA=true` for offline UI development.

## Comprehensive compile (all boards)

The Contacts page builds a **compiled directory** by merging people across:

| Board | What is pulled |
|-------|----------------|
| **Contacts** | Base records (name, email, phone, tags, address, relations) |
| **Short-term Applications** | Volunteers + parent/pastor emails → tags, phone; **Street / City / Postal / Fillout address** |
| **Long-term Applications** | Applicants → volunteer tag, phone, **Home Address** |
| **Current Service Ended** | Alumni volunteers + parent/pastor emails |
| **Donations** | Donor email/name → donor tag |

People are matched by **email**, then combined when the same person appears again with the **same name + phone**, or a no-email Contacts row uniquely matches a name. Existing Contacts board items keep their monday ids; people found only on other boards appear with a `compiled:…` id so they still show in search, filters, map, and batch email. Opening a compiled-only contact shows a limited detail view until they exist on the Contacts board.

Mailing address is **mass-compiled** from every source: the richest street-level fields win (Contacts + short-term Street/Fillout + long-term Home Address). Stuffed single-line addresses are normalized into street/city/state/zip.

Refresh reloads all boards and recompiles. The header shows Contacts vs added-from-other-boards counts, duplicates combined, and how many have a street address.

## Tags

- Stored on the Contacts board **Tags** column (multi-select). Contacts can have **multiple** tags (e.g. Volunteer + Donor, Pastor + Donor, Parent + Donor).
- Editable from the contact detail header (writes to monday via API) for real Contacts items.
- The CRM also **merges role tags** automatically from the boards above.
- Opening a (real) contact detail persists newly derived tags to monday when contacts are writable.
- Filters use **AND** semantics: selecting Volunteer and Donor shows only contacts that have both tags.
- Tag filters do **not** require an email — every contact with the tag is shown (including compiled people with no email).

## Batch email

After filtering by one or more tags (or selecting contacts), use **Email N** in the action bar:

1. Filter by tag(s) — e.g. Donor, or Volunteer + Donor.
2. Optionally **Select all** / refine the checkbox selection.
3. Click **Email N** to open the batch composer.
4. Pick a template or write a message, then **Open in email app** (recipients go in **BCC**) or **Copy BCC list**.

Same message for everyone (mail-client BCC). Per-person merge fields like `{{firstName}}` are not filled in batch mode. Large lists may need **Copy BCC list** if the mailto URL is too long for the mail app.

## Map view

Map view is **hidden** in the Contacts toolbar for now (list only). Geocoding/pin work remains in the codebase (`ContactMapView`, etc.) but is not exposed in the UI until it is reliable enough to ship.

## Service terms (volunteers)

Each linked application item is one **term**. Completed terms from the **Current Service Ended** board are merged into the same list (matched by contact link column, reverse Contact link, or email). When an ended item links to a Short Term application, the ended record replaces the duplicate application entry.

Click a term to open:

- Internal notes (term-scoped updates)
- QuickBooks invoice (if linked on that application — active applications only)
- Pastor reference and full application Q&A
- For ended terms: term dates, files, and end-of-service form fields from the Current Service Ended board
- **End of service review** from the Volunteer Feedback Form board, matched to the closest term by review completion date (item `created_at` unless `VITE_EOS_REVIEW_COL_COMPLETED_DATE` is set)

### End of Service Review board

Volunteer feedback / exit reviews live on a separate monday board (default: **Volunteer Feedback Form**). The CRM reads items linked to the contact (Contacts column) or matched by email, then attaches each review to the service term whose end date is closest to when the review was completed.

```bash
# VITE_EOS_REVIEW_BOARD_ID=4399458542
# VITE_EOS_REVIEW_COL_CONTACT_LINK=Contacts
# VITE_EOS_REVIEW_COL_CONTACT_LINK_ID=connect_boards4
# VITE_EOS_REVIEW_COL_EMAIL=Email
# Optional — e.g. VS Exit Survey board uses Date Volunteer left
# VITE_EOS_REVIEW_COL_COMPLETED_DATE=Date Volunteer left
```

## Donations & payments

Gift history loads from your **Monday Donations board** when `VITE_DONATIONS_BOARD_ID` is set:

- **Linked items** — `link_to_donations` board_relation on the Contacts item
- **Email match** — Donations board **Donor Email** column matched to the contact email

### QuickBooks income sync (recommended)

When `npm run qbo:watch-income` is running, set `VITE_QBO_INCOME_SYNC_ENABLED=true` so the portal reads synced gifts from Monday only (no live QBO fetch on contact open). See [crm-qbo-income-sync.md](./crm-qbo-income-sync.md).

### Live QuickBooks merge (legacy)

QuickBooks records also merge at contact open when `VITE_QUICKBOOKS_PROXY_URL` is configured **and** `VITE_QBO_INCOME_SYNC_ENABLED` is not set (`npm run quickbooks:proxy`):

- Matches by **QuickBooks Customer ID** on the contact, then by **email**
- **View in QuickBooks** opens `https://app.qbo.intuit.com/app/invoice?txnId=…`

```bash
VITE_DONATIONS_BOARD_ID=2473175689
VITE_CONTACT_COL_DONATIONS_LINK_ID=link_to_donations
# VITE_QBO_INCOME_SYNC_ENABLED=true
# VITE_DONATION_COL_EMAIL=Donor Email
# VITE_QUICKBOOKS_PROXY_URL=/api/quickbooks
```

**Project field:** Monday uses the **Program** column; QuickBooks uses line description or memo when present.

## Native contact upsert (replaces Monday automations + Make)

The CRM can **create and update Contacts board items** from source boards without monday.com create-automations or Make.com file copy.

### Match tiers

1. **Email exact** → auto-update  
2. **Phone + last name** → auto-update  
3. **Exact full name** (unique) → auto-update  
4. **Fuzzy first + exact last** → **Contact match review** inbox (sidebar)  
5. Address can boost confidence, never sole auto-merge  
6. Else create  

Updates **fill gaps + union tags**; empty values never wipe non-empty fields.

### Sources

| Source | Contacts created / updated |
|--------|----------------------------|
| Short-term application | Volunteer, Parents, Pastor, New Pastor (kept separately), Spouse |
| Long-term application | Volunteer, Parents, Pastor (not friend / mentor / employer) |
| Current Service Ended | Refresh volunteer (+ spouse/parents/pastors) with latest fields/files |
| Donations board / CRM donation ingest | Donor |
| Recruitment prospect → contact | Recruitment tag via same upsert engine |
| QBO income watcher | Email match then create Donor (`server/mondayDonorSync.mjs`) |

**Not created as Contacts:** Person You Are Accountable To; Emergency contact people (emergency name/phone are copied onto the **volunteer** contact only).

### Couples & pastors

- Married / spouse present → upsert both people; write `Couple: A & B` into **Connected  to:** so the list can show a merged couple row (open either person).
- New pastor → new Pastor contact; old pastor kept; volunteer’s current pastor fields point at the new pastor; **Connected  to:** lists both so search finds the volunteer from either pastor name.

### File sync

Profile / Passport (and spouse slots) copy onto Contacts file columns through the Monday API proxy (`src/services/contactUpsert/syncContactFiles.ts`). Skip when the target slot already has a file. **Retire Make.com** file-copy scenarios once this path is verified in production.

### UI

- Contacts page → **Sync contacts** (recently updated items; cursor in `localStorage`)
- Contacts page → **Full sync** (backfill all boards — use for cutover)
- Sidebar → **Contact matches** for fuzzy/ambiguous approvals
- Sidebar → **Contact duplicates** for same-email board items (merge + delete losers)
- Contacts list → select **exactly 2** → **Merge** (manual board merge)
- Board watcher (when `VITE_MONDAY_WATCH_ENABLED=true`) also refreshes recent CSE items onto Contacts

### Upsert vs board merge

| Feature | What it does |
|---------|----------------|
| **Upsert / Sync contacts** | Create or update Contacts items from apps/donations; does **not** delete duplicates |
| **Compile list** | In-memory collapse by email for display; does **not** write Monday |
| **Merge (select 2)** / **Contact duplicates** | Union tags + fields onto one survivor, keep both emails, **delete** loser Monday items |

### Merging duplicates (tags + emails)

Shared engine: `src/services/contactUpsert/merge/` (CRM manual merge + daily job).

- Tags are **always unioned** (e.g. Parents + Pastor → both on the survivor).
- Survivor prefers the **richest** record (deterministic score; couple bonus capped); Alt Email / Connected-to keep alternate identities; Pastor/Parents push onto connected volunteers on confirmed merge.
- **Auto-merge only** when exact normalized email **and** identical full name (or exact name + compatible email). **Same email + different names → Contact duplicates review** (never auto).
- Losers are **archived** (not hard-deleted). Settings → **Contact merge ops** for reports / reverse.
- **Daily job:** `Merge Contact Duplicates` at **17:00 Europe/Athens** (`npm run merge:contact-duplicates`). Defaults to **report-only** (`MERGE_REPORT_ONLY=true`) until you opt into live via workflow_dispatch `live=true`.
- When emails differ: survivor keeps **Email**; the other address goes to **Alt Email**.
- Compiled-only rows (`compiled:…`) cannot be merge targets.

### Update rules

- Default upsert **fills gaps** (existing non-empty wins) and **unions tags**
- Empty incoming values never wipe existing fields
- **Current Service Ended** refresh prefers newer non-empty values and re-syncs Profile/Passport (`force`)
- Ambiguous multi-email matches auto-update the best Contacts-board survivor when scores are clear; otherwise Match Review

### Cutover checklist (disable Monday automations + Make)

Do this **after** verifying Sync contacts on a few known people (ST apply, spouse, new pastor, CSE, LT volunteer/parents/pastor, donation).

1. **Local / staging verify**
   - Run `npm run dev:live` (Vite + Monday proxy on `:4040` / `:4042`)
   - Contacts → **Sync contacts** on recent items; open Match Review if any fuzzy hits
   - Confirm Profile/Passport landed on Contacts without Make
2. **Full backfill**
   - Contacts → **Full sync** once (or when boards are quiet)
   - Resolve remaining items in **Contact matches**
3. **Disable Monday contact-create automations**
   - On Applications / LT / Donations / CSE boards: turn off any automation that **creates** a Contacts item when a form is submitted or status changes
   - Leave relation/status automations that do not create Contacts alone
4. **Pause Make.com file-copy scenario**
   - Pause the scenario that downloads Profile/Passport from Applications and uploads to Contacts
   - CRM native path: `src/services/contactUpsert/syncContactFiles.ts` via Monday API proxy
5. **QBO**
   - Income watcher already upserts donors by email, then unique exact name (`server/mondayDonorSync.mjs`)
   - No separate Make donor-create needed
6. **Rollback**
   - Re-enable Monday create automations and Make if native sync misbehaves
   - Contacts already created by CRM remain; re-running Full sync is safe (fill-gaps + match tiers)

### Code map

- `src/services/contactUpsert/contactMatch.ts` — match tiers  
- `src/services/contactUpsert/contactUpsert.ts` — create/update/queue review  
- `src/services/contactUpsert/ingestApplicationBundle.ts` — ST/LT/CSE people + files  
- `src/services/contactUpsert/runContactIngest.ts` — board orchestrator + CSE refresh  
- `src/services/contactUpsert/contactBoardDedupe.ts` — board merge (tags union, Alt Email, delete losers)  


## OAuth

Same Board View app as Applications; read items on Contacts and Applications boards. Tag updates need column write permission on the Contacts board.
