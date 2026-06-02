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
| Phone | phone | Optional |
| Profile Photo | file | Optional |
| QuickBooks Customer ID | text | Optional; speeds financial lookup |
| Applications | board_relation | Links to Applications board items (one per term) |
| Address, City, Country, Date of birth | text | Optional demographics |

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

## Donations & payments (QuickBooks)

Financial history is loaded from the QuickBooks proxy — not a monday Donations board.

- Requires `VITE_QUICKBOOKS_PROXY_URL` and `npm run quickbooks:proxy`
- Matches customer by **QuickBooks Customer ID** on the contact, then by **email**
- **View in QuickBooks** opens `https://app.qbo.intuit.com/app/invoice?txnId=…`

**Project field:** QuickBooks standard invoices do not have a dedicated project field. The UI shows line **description** or memo as “Project” when present. Map a custom field later if needed.

## OAuth

Same Board View app as Applications; read items on Contacts and Applications boards. Tag updates need column write permission on the Contacts board.
