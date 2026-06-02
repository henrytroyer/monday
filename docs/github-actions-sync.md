# Schedule the Monday → Mailchimp Sync with GitHub Actions

This guide walks you through running the `npm run sync:contacts` command automatically once a day using GitHub Actions. Each step assumes you are new to GitHub Actions. Follow them in order and you will have a working daily sync.

---

## 1. Collect the Secrets You Will Need

Before touching GitHub, make sure you have these values copied somewhere safe (for example in a temporary notes file). You will paste each one into GitHub in the next section.

| Secret Name | Where to find it | Notes |
| --- | --- | --- |
| `MONDAY_API_TOKEN` | monday.com → top-right avatar → Developers → API tokens | Must have access to the board you want to sync. |
| `MONDAY_BOARD_NAME` | The exact board name in monday.com | Default in the script is `Contacts Test`. Use whatever board holds your contacts. |
| `MAILCHIMP_API_KEY` | mailchimp.com → Account → Extras → API keys | The key format is `dc-key` (example `us1-abc123`). |
| `MAILCHIMP_LIST_ID` | Mailchimp → Audience → Settings → Audience name and defaults | Also called “Audience ID”. |
| `MAILCHIMP_DATACENTER` | Usually the part before the dash in your API key (example `us1`) | If unsure, check your API key format or Mailchimp account URL. |

> Tip: If you already have these values in your local `.env`, reuse them. Do **not** commit the `.env` file itself—only copy the values into GitHub secrets.

---

## 2. Add Secrets in GitHub (One by One)

1. Open your repository on github.com (for example `https://github.com/henrytroyer/monday`).
2. Click the **Settings** tab (top of the page, next to “Code”, “Issues”, etc.).
3. In the left sidebar, choose **Secrets and variables → Actions**.
4. Click the **New repository secret** button.
5. Fill in the secret:
   - **Name**: exactly match one of the names above (for example `MONDAY_API_TOKEN`).
   - **Value**: paste the value you collected.
6. Press **Add secret**.
7. Repeat steps 4–6 for every required secret (`MONDAY_API_TOKEN`, `MONDAY_BOARD_NAME`, `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID`, `MAILCHIMP_DATACENTER`).

> If you ever rotate a key, return here and **Update** the corresponding secret.

---

## 3. Create the GitHub Actions Workflow File

We will create a workflow file that GitHub runs automatically. The file lives inside a special folder named `.github/workflows/` in your repository.

### 3.1 Create the folder (if needed)

1. In your project on your computer, make sure the folders `.github/workflows/` exist. If not:
   ```bash
   mkdir -p .github/workflows
   ```

### 3.2 Add `mailchimp-sync.yml`

1. In `.github/workflows/`, create a new file named `mailchimp-sync.yml`.
2. Paste the following content, which tells GitHub Actions to run every day at midnight UTC:
   ```yaml
   name: Daily Monday to Mailchimp Sync

   on:
     schedule:
       - cron: '0 0 * * *'   # Runs every day at 00:00 UTC
     workflow_dispatch:      # Allows you to run it manually from GitHub

   jobs:
     sync:
       runs-on: ubuntu-latest

       steps:
         - name: Check out repository
           uses: actions/checkout@v4

         - name: Set up Node.js 20
           uses: actions/setup-node@v4
           with:
             node-version: 20

         - name: Install dependencies
           run: npm ci

         - name: Run Monday → Mailchimp sync
           run: npm run sync:contacts
           env:
             MONDAY_API_TOKEN: ${{ secrets.MONDAY_API_TOKEN }}
             MONDAY_BOARD_NAME: ${{ secrets.MONDAY_BOARD_NAME }}
             MAILCHIMP_API_KEY: ${{ secrets.MAILCHIMP_API_KEY }}
             MAILCHIMP_LIST_ID: ${{ secrets.MAILCHIMP_LIST_ID }}
             MAILCHIMP_DATACENTER: ${{ secrets.MAILCHIMP_DATACENTER }}
   ```

**What this file does:**
- `schedule` tells GitHub to run it daily. Adjust the cron expression if you want a different time.
- `workflow_dispatch` gives you a “Run workflow” button in the GitHub UI for testing.
- `npm ci` installs dependencies exactly as your `package-lock.json` defines.
- The `env:` block injects your secrets into the script exactly like a `.env` file would.

3. Commit the new workflow file to your repo (`git add`, `git commit`, `git push`). The next section shows how to test it.

---

## 4. Test and Monitor the Workflow

1. On github.com, visit your repo and click the **Actions** tab.
2. You should see “Daily Monday to Mailchimp Sync” listed on the left. Click it.
3. **Manual test**: Click the **Run workflow** button (top-right). Choose the branch (typically `main`) and click **Run workflow**. This triggers the job immediately.
4. Click into the running job to watch live logs. Each step expands with a caret (`>`). Pay attention to the “Run Monday → Mailchimp sync” step.
5. When it finishes, the workflow shows a green checkmark (success) or red X (failure). If it fails:
   - Expand the failing step to read the error.
   - Common issues: missing or incorrect secret values, network/API errors, wrong board/list names.
   - Fix the issue (update secrets or code) and re-run the workflow.

### Ongoing Monitoring
- GitHub automatically runs the workflow every day at the scheduled time.
- You will receive email notifications for failed runs if you watch the repository.
- You can view history under **Actions → Daily Monday to Mailchimp Sync → workflow runs**.

---

## 5. Optional Improvements

- **Notifications**: Add a step that posts success/failure to Slack, email, or monday.com.
- **Different time of day**: Adjust the cron expression. Example: `0 12 * * *` runs at 12:00 UTC daily.
- **Multiple boards/lists**: Duplicate the “Run Monday → Mailchimp sync” step with different env values, or enhance your script to handle multiple targets.

---

## 6. Quick Troubleshooting Reference

| Problem | Possible Fix |
| --- | --- |
| Workflow fails saying a secret is missing | Double-check the secret name spelling in GitHub and in `mailchimp-sync.yml`. |
| Mailchimp errors (401/403) | Ensure the API key is active and the datacenter matches (`us1`, `us2`, etc.). |
| Monday board not found | Make sure `MONDAY_BOARD_NAME` exactly matches the board name (case-sensitive). |
| Script cannot read `.env` during local testing | Confirm your local `.env` matches the new secrets and is stored in the project root. |

---

You now have an automated daily sync running from GitHub Actions. If you need to pause it, commit a change that comments out the workflow or delete the `mailchimp-sync.yml` file. To resume, restore the file.
