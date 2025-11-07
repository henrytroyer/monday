# Scripts Directory

This directory contains backend scripts for syncing data between monday.com and external services.

## Contact Sync Script

### Overview
The `sync-contacts.ts` script synchronizes contacts from a monday.com board to Mailchimp:
- Finds the "Contacts" board (or custom board name)
- Extracts contact data: Item name, Email column, type column
- Matches contacts in Mailchimp by email address
- Adds "type" values as tags in Mailchimp

### Prerequisites
1. **Environment Variables**: Create a `.env` file in the project root with:
   ```
   MONDAY_API_TOKEN=your_monday_api_token
   MAILCHIMP_API_KEY=your_mailchimp_api_key
   MAILCHIMP_LIST_ID=your_mailchimp_list_id
   MONDAY_BOARD_NAME=Contacts  # Optional, defaults to "Contacts"
   ```

2. **Monday.com Setup**:
   - Get your API token from: Profile → Developers → API token
   - Ensure you have a board named "Contacts Test" (or set `MONDAY_BOARD_NAME` in .env)
   - Board must have columns: "Email" and "type" (case-insensitive)
   - **All three fields are required**: Item name, Email, and type
   - Entries with any empty field will be skipped

3. **Mailchimp Setup**:
   - Get your API key from: Account → Extras → API keys
   - Get your List ID from: Audience → Settings → Audience name and defaults
   - API key format: `{dc}-{key}` (e.g., `us1-abc123...`)

### Usage

Run the sync script:
```bash
npm run sync:contacts
```

### How It Works

1. **Finds Board**: Searches all boards for one matching the name (case-insensitive)
2. **Discovers Columns**: Dynamically finds "Email" and "type" columns by title
3. **Extracts Contacts**: Reads all items from the board and extracts:
   - Item name → Contact name
   - Email column → Email address
   - type column → Tag value
4. **Syncs to Mailchimp**:
   - Creates new members if they don't exist
   - Updates existing members if they do exist
   - Adds "type" value as a tag to each contact

### Column Requirements

Your monday.com board must have:
- **Item name**: The item's name field (this is the contact's full name)
- **Email column**: Column titled "Email" (case-insensitive) - **Required**
  - Can be type: email, text, or similar
  - Must contain a valid email address
- **type column**: Column titled "type" (case-insensitive) - **Required**
  - Can be type: status, text, dropdown, etc.
  - This value will be added as a tag in Mailchimp

**Important**: All three fields (Item name, Email, type) must be filled in. Any entry with an empty field will be skipped during sync.

### Error Handling

The script will:
- Skip items with empty Item name, Email, or type fields
- Skip items without valid email addresses (must contain @)
- Log errors for failed syncs but continue with remaining contacts
- Show a summary at the end with success/error counts

### Rate Limits

The script includes a 100ms delay between contacts to avoid hitting API rate limits. For large lists, you may need to adjust this delay.

### Troubleshooting

**"Board not found"**
- Check that the board name matches exactly (case-insensitive)
- Verify `MONDAY_BOARD_NAME` in `.env` if using custom name

**"Email column not found"**
- Ensure you have a column titled "Email" (case-insensitive)
- Check the script output for available column names

**"Mailchimp API errors"**
- Verify your API key format: `{dc}-{key}`
- Check that your List ID is correct
- Ensure your Mailchimp account is active

**"Type column not found"**
- This is a warning, not an error
- Contacts will sync but tags won't be added
- Add a "type" column to your board if you want tags synced

