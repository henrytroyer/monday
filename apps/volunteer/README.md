# Volunteer portal

Google sign-in, a profile form, and find-or-create on the Contacts board,
then the volunteer portal. The staff CRM stays on http://localhost:4040. This
app does not call `mondayApiProxy`.

Sign-in uses the i58-finance Firebase project (`signInWithGoogle`). The
identity service checks that Firebase ID token, then looks up Email and Alt
Email. A unique match fills blank phone, address, and date-of-birth fields.
No match creates a contact tagged Volunteer. One phone plus last-name match
asks the person to confirm; yes keeps that contact and stores the Google
address in Alt Email. Two emails, or several phone matches, stop for a staff
person and do not merge.

When the contact is found or created, the portal opens. Portal data
(application steps, forms) is still mock: `jane.miller@example.com` shows the
mid-pipeline fixture, and any other email starts a fresh preview application.
Application status and pastor-reference routing are not live yet.

## Run

Copy `.env.example` to `.env` if it is not already there. The Monday token
is read from the repo root `.env` (`MONDAY_API_TOKEN`).

```bash
cd apps/volunteer
npm install
npm run identity
```

In a second terminal:

```bash
cd apps/volunteer
npm run dev
```

Open **http://localhost:4050**

`npm run identity` listens on http://127.0.0.1:4051. Vite proxies
`/api/volunteer-identity` to it.

## What is in the portal

- Home: next step and the journey map (plane moves from North America toward Europe as steps complete)
- Short-term: Application process (Getting Started → General Information → Passport Details → Profile Photo → History / Skills / Languages → Family Status → Spouse Application → Term of Service → Other Contacts → Guidelines on the No path)
- Preview: `PREVIEW_OPEN_ANY_STEP` in `src/process/previewAccess.ts` lets you open any form step from the list. Set it to `false` to restore linear gating.
- Long-term and Volunteer information pages

## Production

Deploy `volunteerIdentity` from henrytroyer/i58finance
(`functions/src/api/volunteerIdentity.ts`). It uses the existing
`MONDAY_API_TOKEN` secret and verifies any Firebase ID token. It is not an
admin route. Set `VITE_VOLUNTEER_IDENTITY_URL` to that function and add the
volunteer host to Firebase authorized domains.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite on :4050 |
| `npm run identity` | Local find-or-create service on :4051 |
| `npm run typecheck` | Typecheck |
| `npm run lint` | ESLint |
| `npm test` | Identity, portal, and mock-client tests |
| `npm run build` | Production build |
| `npm run validate` | typecheck + test + lint + build |
