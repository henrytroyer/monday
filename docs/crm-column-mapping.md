# CRM column mapping

The CRM reads your Applications board by **column title** (case-insensitive).

## Configure titles

Edit [`src/config/columnMap.ts`](../src/config/columnMap.ts):

| CRM field | Default monday column title |
|-----------|----------------------------|
| locationPreference | Location Preference |
| location | Location (assigned / confirmed placement) |
| status | Status |
| signupTimeline | Signup Timeline |
| housing | Housing |
| itinerary | Itinerary Notes (long text or structured; see below) |
| itineraryFiles | Itinerary (file column — listed in Files section) |
| arrivalDate | Arrival Date |
| arrivalTime | Arrival Time |
| arrivalAirport | Arrival Airport |
| departureDate | Departure Date |
| departureTime | Departure Time |
| departureAirport | Departure Airport |
| arrival | Arrival (legacy fallback if itinerary empty) |
| coordinator | Coordinator |
| notes | Internal Notes |
| applicationSubmitted | Application Submitted |
| invoicePaid | Invoice Paid |
| quickbooksInvoiceId | QuickBooks Invoice ID (links Invoice Paid step to QBO) |
| pastorReference | Pastor Reference |
| addedToChatGroup | Added To Chat Group |
| sentToField | Sent To Field |
| email | Email |
| parentEmail | Parent Email |
| pastorEmail | Pastor Email |
| otherReferenceEmails | Other Reference Emails (comma/semicolon/newline separated) |
| phone | Phone |
| profilePhoto | Profile Photo |
| files | Files |

Override via `.env` — see `.env.example` (`VITE_COL_*`).

## Discover your board’s columns

1. Open the Applications board in monday.com.
2. Note exact column names from the board header row.
3. Update `columnMap.ts` to match.

Or use GraphQL in Developer Center API playground with your board id:

```graphql
query {
  boards(ids: [YOUR_BOARD_ID]) {
    columns {
      id
      title
      type
    }
  }
}
```

## Pipeline stages

Groups on the board become pipeline sections (e.g. "New Applications"). Group **title** must match how you organize volunteers.

## Signup timeline filter

Volunteers’ timeline column value is mapped to internal ids in [`src/config/timelineMap.ts`](../src/config/timelineMap.ts).

If a monday label is not listed, it still appears in the UI as `raw:Your Label` but won’t match preset timeline filter pills until you add:

```ts
'Your exact monday label': 'summer-2026-a',
```

Preset ids are defined in [`src/data/timelines.ts`](../src/data/timelines.ts).

## Itinerary (Placement Details)

The CRM shows **Arrival** and **Departure** bubbles (date, time, airport). Data is read in this order:

1. Separate columns: Arrival Date / Time / Airport and Departure Date / Time / Airport  
2. A single **Itinerary** long-text column, e.g.:

```text
Arrival: June 8, 2026 at 2:30 PM — Athens (ATH)
Departure: July 19, 2026 at 10:15 AM — Athens (ATH)
```

3. JSON in **Itinerary**:

```json
{
  "arrival": { "date": "June 8, 2026", "time": "2:30 PM", "airport": "ATH" },
  "departure": { "date": "July 19, 2026", "time": "10:15 AM", "airport": "ATH" }
}
```

4. Legacy **Arrival** column (date/time/airport parsed from one line)

## Onboarding steps

Status columns marked "Done", "Complete", "Paid", etc. show as **Complete** in the slide-over; other non-empty values show as **Pending**.

## Full application & pastor reference panels

From the volunteer detail **Quick Actions**:

| Action | Columns shown |
|--------|----------------|
| **View Full Application** | Every board column whose title is **not** listed in `columnMap.ts` (CRM fields already on the detail card) |
| **View Pastor Reference** | Columns whose title contains `pastor` or `reference` (case-insensitive), plus any titles in `VITE_PASTOR_REFERENCE_COLUMNS` |

Both panels exclude column types such as `mirror`, `board_relation`, `subtasks`, and empty values. The onboarding **Pastor Reference** status column (Done/Pending) is excluded from the pastor Q&A panel.

To hide a field from **Full application**, add its title to `columnMap` or rename it on the board. To force a column into **Pastor reference**, include its exact title in `VITE_PASTOR_REFERENCE_COLUMNS` (comma-separated).

## Volunteer files (Applications detail, Contacts drill-down, term drill-down)

Upload files to the **Files** column (and profile image to **Profile Photo**). The CRM matches documents by **filename** (case-insensitive substring):

| Slot | Filename should contain |
|------|-------------------------|
| Passport | `passport` |
| Background check | `background` — **password required** in the CRM (preset: `Background`) |
| Child safeguarding certificate | `safeguard` |
| Profile photo | **Profile Photo** column, or an image in **Files** with `profile` in the name |

Examples: `Passport.pdf`, `Background-check.pdf`, `Child-safeguarding-certificate.pdf`.

Other files in the column (itinerary, application form, pastor reference) appear under **Other documents** on the Applications detail and term drill-down views.

Background check uses a client-side coordinator password for prototype convenience; production deployments should use proper access control.
