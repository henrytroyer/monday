# Volunteer portal (mock)

Mock volunteer hub. Isolated from the staff CRM (no Monday, no live writes).
Staff CRM stays on http://localhost:4040.

## Run

```bash
cd apps/volunteer
npm install
npm run dev
```

Open **http://localhost:4050**

Demo sign-in: `jane.miller@example.com`

## What is in this preview

- Sign-in / Create Account (Hope in Action landing)
- Home menus → Application process, Forms & References, Long-term, Volunteer information
- Short-term: Application process (Getting Started → General Information → Passport Details → Profile Photo → History / Skills / Languages → Family Status → Spouse Application → Term of Service → Other Contacts → Guidelines on the No path), Forms & References
- Preview: `PREVIEW_OPEN_ANY_STEP` in `src/process/previewAccess.ts` lets you open any form step from the list. Set it to `false` to restore linear gating.
- Long-term and Volunteer information are stubs

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite on :4050 |
| `npm run typecheck` | Typecheck |
| `npm run lint` | ESLint |
| `npm test` | Unit tests |
| `npm run build` | Production build |
| `npm run validate` | typecheck + test + lint + build |
