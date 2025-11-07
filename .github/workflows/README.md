# GitHub Actions Workflows

## Sync Contacts Workflow

The `sync-contacts.yml` workflow automatically syncs contacts from monday.com to Mailchimp.

### Setup

1. **Add Secrets to GitHub Repository:**
   - Go to your repository on GitHub
   - Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `MONDAY_API_TOKEN` - Your monday.com API token
     - `MAILCHIMP_API_KEY` - Your Mailchimp API key
     - `MAILCHIMP_LIST_ID` - Your Mailchimp list/audience ID
     - `MAILCHIMP_DATACENTER` - Your Mailchimp datacenter (e.g., `us1`)
     - `MONDAY_BOARD_NAME` - (Optional) Board name, defaults to "Contacts Test"

### How to Run

**Manual Trigger:**
- Go to Actions tab in GitHub
- Select "Sync Contacts to Mailchimp"
- Click "Run workflow"
- Select branch (usually `main`)
- Click "Run workflow"

**Scheduled (if enabled):**
- Uncomment the `schedule` section in the workflow file
- Adjust the cron schedule as needed
- Workflow will run automatically at the scheduled time

**On Push (if enabled):**
- Uncomment the `push` section in the workflow file
- Workflow will run automatically when you push to main

### Viewing Results

- Go to Actions tab to see workflow runs
- Click on a run to see logs
- If sync fails, logs will be uploaded as artifacts

