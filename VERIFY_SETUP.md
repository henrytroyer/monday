# Verify setup

Run the automated setup checker:

```bash
npm run verify
```

This checks:

- `.env` exists
- Required variables for live mode (`MONDAY_API_TOKEN`, board IDs, proxy URL)
- Whether the Monday API proxy is running on port 4042

For full setup instructions, see **[COLLABORATOR_SETUP.md](./COLLABORATOR_SETUP.md)**.
