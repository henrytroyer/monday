#!/bin/bash
# Verification script to check monday.com app connection

echo "🔍 Verifying monday.com App Connection"
echo "========================================"
echo ""

# Check 1: Dev server
echo "1. Checking dev server..."
if lsof -i :4040 | grep -q node; then
    echo "   ✅ Dev server is running on port 4040"
    DEV_SERVER_OK=true
else
    echo "   ❌ Dev server is NOT running"
    echo "   Run: npm run dev"
    DEV_SERVER_OK=false
fi
echo ""

# Check 2: Ngrok tunnel
echo "2. Checking ngrok tunnel..."
if pgrep -f "ngrok http" > /dev/null; then
    echo "   ✅ Ngrok tunnel is running"
    NGROK_OK=true
    
    # Try to get the URL
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['tunnels'][0]['public_url'] if data.get('tunnels') else '')" 2>/dev/null)
    if [ ! -z "$NGROK_URL" ]; then
        echo "   ✅ Your ngrok URL: $NGROK_URL"
    else
        echo "   ⚠️  Could not retrieve ngrok URL automatically"
        echo "   Check the terminal where you ran: npm run monday:tunnel"
    fi
else
    echo "   ❌ Ngrok tunnel is NOT running"
    echo "   Run: npm run monday:tunnel"
    NGROK_OK=false
fi
echo ""

# Check 3: Local app accessibility
echo "3. Testing local app..."
if curl -s http://localhost:4040 > /dev/null 2>&1; then
    echo "   ✅ Local app is accessible at http://localhost:4040"
    LOCAL_OK=true
else
    echo "   ❌ Local app is NOT accessible"
    LOCAL_OK=false
fi
echo ""

# Check 4: Ngrok URL accessibility (if we have it)
if [ ! -z "$NGROK_URL" ]; then
    echo "4. Testing ngrok URL..."
    if curl -s -L --max-time 5 "$NGROK_URL" > /dev/null 2>&1; then
        echo "   ✅ Ngrok URL is accessible: $NGROK_URL"
        echo "   Open this URL in your browser to test: $NGROK_URL"
        NGROK_URL_OK=true
    else
        echo "   ⚠️  Ngrok URL test failed (may show warning page - that's OK)"
        NGROK_URL_OK=false
    fi
    echo ""
fi

# Summary
echo "========================================"
echo "Summary:"
echo ""

if [ "$DEV_SERVER_OK" = true ] && [ "$NGROK_OK" = true ] && [ "$LOCAL_OK" = true ]; then
    echo "✅ Basic setup looks good!"
    echo ""
    echo "Next steps:"
    echo "1. Copy your ngrok URL (shown above or check tunnel terminal)"
    echo "2. Go to monday.com Developer Center"
    echo "3. Your App → Features → Your Feature → Custom URL"
    echo "4. Paste the ngrok URL and save"
    echo "5. Open a board in monday.com → Views → Your custom view"
    echo ""
    if [ ! -z "$NGROK_URL" ]; then
        echo "Your ngrok URL: $NGROK_URL"
    fi
else
    echo "❌ Some issues found. Fix the items marked with ❌ above."
fi


