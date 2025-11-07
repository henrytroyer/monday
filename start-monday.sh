#!/bin/bash
# Quick script to start monday.com development

echo "🚀 Starting monday.com Development Setup..."
echo ""

# Check if logged in
echo "Checking authentication..."
npx @mondaydotcomorg/monday-cli whoami > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Not logged in. Running login..."
    npm run monday:login
    if [ $? -ne 0 ]; then
        echo "❌ Login failed. Please try manually: npm run monday:login"
        exit 1
    fi
else
    echo "✅ Already authenticated"
fi

echo ""
echo "Starting development server..."
echo "📝 Note: Copy the tunnel URL and add it to your app's Custom URL in Developer Center"
echo ""

npm run monday:start
