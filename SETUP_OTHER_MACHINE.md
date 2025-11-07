# Setting Up This Project on Another Machine

This guide explains how to clone and set up this project on a new machine.

## Prerequisites

- Node.js (v18 or higher) and npm
- Git installed
- GitHub account access

## Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/henrytroyer/monday.git

# Navigate into the project
cd monday
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Set Up Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env  # If you have an example file
# Or create .env manually
```

Add your credentials to `.env`:

```env
MONDAY_API_TOKEN=your_monday_api_token_here
MAILCHIMP_API_KEY=your_mailchimp_api_key_here
MAILCHIMP_LIST_ID=your_mailchimp_list_id_here
MAILCHIMP_DATACENTER=us1
MONDAY_BOARD_NAME=Contacts Test
```

## Step 4: Authenticate with GitHub (Optional)

If you want to push/pull changes:

```bash
# Install GitHub CLI (if not already installed)
brew install gh  # macOS
# or visit: https://cli.github.com/

# Authenticate
gh auth login

# Configure git to use GitHub CLI
gh auth setup-git
```

## Step 5: Verify Setup

```bash
# Test the sync script
npm run sync:contacts

# Test git sync
npm run git:sync
```

## Daily Workflow

### Pull Latest Changes

```bash
# Always pull before starting work
npm run git:sync
# or
git pull origin main
```

### Make Changes and Push

```bash
# Make your changes
# ...

# Commit
git add .
git commit -m "Your commit message"

# Push (sync script will pull first, then push)
npm run git:sync
# or manually:
git pull origin main
git push origin main
```

## Important Notes

- **Always pull before pushing**: Use `npm run git:sync` which pulls first
- **Never commit `.env`**: Your `.env` file is gitignored for security
- **Communicate with team**: Let others know what you're working on
- **Resolve conflicts**: If git shows conflicts, resolve them before pushing

## Troubleshooting

### "Permission denied" when pushing
- Make sure you're authenticated: `gh auth login`
- Check your GitHub permissions

### "Your branch is behind"
- Run `npm run git:sync` to pull latest changes
- Resolve any conflicts if they appear

### "Cannot find module" errors
- Run `npm install` to install dependencies

