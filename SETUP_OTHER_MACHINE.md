# Setting Up This Project on Another Machine

**For the volunteer CRM:** see **[COLLABORATOR_SETUP.md](./COLLABORATOR_SETUP.md)** — that is the canonical setup guide.

This document covers git workflow and optional Mailchimp sync.

## Prerequisites

- Node.js 20+ (see `.nvmrc`)
- Git
- GitHub account access

## Clone and install

```bash
git clone https://github.com/henrytroyer/monday.git
cd monday
npm install
npm run setup
```

Follow [COLLABORATOR_SETUP.md](./COLLABORATOR_SETUP.md) for live Monday data setup.

## Daily git workflow

```bash
git pull origin main    # always pull before starting work
# ... make changes ...
git add -A
git commit -m "feat: your change"
git push origin main
```

Or use the sync script (pulls first, then pushes):

```bash
npm run git:sync
```

## Important notes

- **Never commit `.env`** — it is gitignored for security
- **Always pull before pushing** to avoid conflicts
- Each developer uses their own `MONDAY_API_TOKEN`

## Mailchimp contact sync

Optional script to sync monday.com contacts to Mailchimp.

### Environment variables

Add to `.env`:

```env
MONDAY_API_TOKEN=your_monday_api_token_here
MAILCHIMP_API_KEY=your_mailchimp_api_key_here
MAILCHIMP_LIST_ID=your_mailchimp_list_id_here
MAILCHIMP_DATACENTER=us1
MONDAY_BOARD_NAME=Contacts
```

### Run locally

```bash
npm run sync:contacts
```

### GitHub Actions

1. Add secrets in GitHub → Settings → Secrets → Actions:
   - `MONDAY_API_TOKEN`
   - `MAILCHIMP_API_KEY`
   - `MAILCHIMP_LIST_ID`
   - `MAILCHIMP_DATACENTER` (e.g. `us1`)
   - `MONDAY_BOARD_NAME` (optional)

2. Run workflow: Actions → "Sync Contacts to Mailchimp" → Run workflow

Workflow file: `.github/workflows/mailchimp-sync.yml`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Permission denied on push | `gh auth login` |
| Branch behind remote | `git pull origin main` |
| Cannot find module | `npm install` |
| CRM not loading live data | See [COLLABORATOR_SETUP.md](./COLLABORATOR_SETUP.md) |
