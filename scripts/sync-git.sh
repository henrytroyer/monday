#!/bin/bash
# Git sync script: Pull latest changes, then push local changes
# Usage: ./scripts/sync-git.sh

set -e

echo "🔄 Syncing with GitHub..."
echo ""

# Fetch latest changes
echo "📥 Fetching latest changes from GitHub..."
git fetch origin

# Check if there are remote changes
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})
BASE=$(git merge-base @ @{u})

if [ $LOCAL = $REMOTE ]; then
    echo "✅ Local branch is up to date with remote"
elif [ $LOCAL = $BASE ]; then
    echo "📥 Pulling remote changes..."
    git pull origin main
elif [ $REMOTE = $BASE ]; then
    echo "📤 Local changes ahead, pushing..."
    git push origin main
else
    echo "⚠️  Diverged branches detected"
    echo "   Local:  $LOCAL"
    echo "   Remote: $REMOTE"
    echo "   Base:   $BASE"
    echo ""
    echo "Please resolve conflicts manually:"
    echo "  1. git pull origin main"
    echo "  2. Resolve conflicts"
    echo "  3. git push origin main"
    exit 1
fi

# Push any local commits
echo "📤 Pushing local commits..."
git push origin main

echo ""
echo "✅ Sync complete!"

