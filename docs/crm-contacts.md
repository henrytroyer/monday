# Contacts (master list)

The **Contacts** page is the master directory for volunteers, pastors, parents, and donors.

## monday.com setup

### Contacts board

Create or use a board (default name in sync script: `Contacts Test`). Required columns:

| Column title | Type | Notes |
|--------------|------|--------|
| Email | email | Primary match key |
| Tags | status (multi-label) | Labels: `Volunteer`, `Pastor`, `Parent`, `Donor` |
| type | status/text | Legacy single-value column (still read if present) |
| Phone | phone | Optional; displayed in international format (`+1 555 123 4567`); writes use `{ phone, countryShortName }` JSON |
| Profile Photo | file | Optional |
| Passport Photo | file | Optional; shown in volunteer files panel |
| Files | file | Optional gallery; passport matched by filename |
| QuickBooks Customer ID | text | Optional; speeds financial lookup |
| Applications | board_relation | Links to Applications board items (one per term) |
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
```

Use `VITE_USE_MOCK_DATA=true` for offline UI development.

## Tags

- Stored on the Contacts board **Tags** column (multi-select).
- Editable from the contact detail header (writes to monday via API).
- Parent/pastor relationships are inferred from application email columns when the Applications board id is configured.

## Service terms (volunteers)

Each linked application item is one **term**. Click a term to open:

- Internal notes (term-scoped updates)
- QuickBooks invoice (if linked on that application)
- Pastor reference and full application Q&A

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

## OAuth

Same Board View app as Applications; read items on Contacts and Applications boards. Tag updates need column write permission on the Contacts board.
