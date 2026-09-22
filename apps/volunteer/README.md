# Volunteer landing

Google sign-in, a profile form, and find-or-create on the Contacts board.
The staff CRM stays on http://localhost:4040. This app does not call
`mondayApiProxy`.

Sign-in uses the i58-finance Firebase project (`signInWithGoogle`). The
identity service checks that Firebase ID token, then looks up Email and Alt
Email. A unique match fills blank phone, address, and date-of-birth fields.
No match creates a contact tagged Volunteer. One phone plus last-name match
asks the person to confirm; yes keeps that contact and stores the Google
address in Alt Email. Two emails, or several phone matches, stop for a staff
person and do not merge.

Application status and pastor-reference routing are not in this version.

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
| `npm test` | Identity and mock-client tests |
| `npm run build` | Production build |
