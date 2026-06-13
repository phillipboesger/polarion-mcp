#!/bin/bash
# Generate a secure API key for HTTP server authentication

echo "🔐 Generating secure API key for HTTP server..."
echo ""
API_KEY=$(openssl rand -hex 32)
echo "Your new API key:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$API_KEY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Add this to your .env file:"
echo "HTTP_API_KEY=$API_KEY"
echo ""
echo "🤖 Configure this in your Custom GPT:"
echo "   1. Go to Custom GPT → Configure → Actions"
echo "   2. Click on 'Authentication' → 'API Key'"
echo "   3. Choose 'Bearer' authentication"
echo "   4. Paste the API key above"
echo ""
