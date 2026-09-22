# Volunteer status shell

Mock, read-only short-term volunteer status UI. Isolated from the staff CRM (no
Monday, no `mondayApiProxy`, no writes). Staff CRM stays on
http://localhost:4040.

## Run

```bash
cd apps/volunteer
npm install
npm run dev
```

Open **http://localhost:4050**

Demo email: `jane.miller@example.com`

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite on :4050 |
| `npm run typecheck` | Typecheck |
| `npm run lint` | ESLint |
| `npm test` | Mock client tests |
| `npm run build` | Production build |
