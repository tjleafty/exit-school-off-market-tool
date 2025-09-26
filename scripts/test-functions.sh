#!/bin/bash

# Test Supabase Edge Functions locally and remotely
# Usage: ./scripts/test-functions.sh [local|remote] [function-name]

set -e

echo "🧪 Testing Supabase Edge Functions..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
MODE=${1:-"local"}
FUNCTION=${2:-"all"}

# Test data
SAMPLE_COMPANY_ID="12345678-1234-1234-1234-123456789012"
SAMPLE_USER_ID="87654321-4321-4321-4321-210987654321"
SAMPLE_CAMPAIGN_ID="abcdefgh-abcd-abcd-abcd-abcdefghijkl"

# Function URLs
if [ "$MODE" = "local" ]; then
    BASE_URL="http://localhost:54321/functions/v1"
    echo -e "${BLUE}🏠 Testing functions locally${NC}"
else
    BASE_URL="https://$(supabase projects list --output json | jq -r '.[0].id').supabase.co/functions/v1"
    echo -e "${BLUE}☁️  Testing functions remotely${NC}"
fi

# Function to test enrich-company
test_enrich_company() {
    echo -e "${YELLOW}🔍 Testing enrich-company function...${NC}"
    
    local payload='{
        "companyId": "'$SAMPLE_COMPANY_ID'",
        "providers": ["hunter", "apollo"]
    }'
    
    echo "Payload: $payload"
    
    local response=$(curl -s -X POST "$BASE_URL/enrich-company" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -d "$payload")
    
    echo "Response: $response"
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ enrich-company test passed${NC}"
        return 0
    else
        echo -e "${RED}❌ enrich-company test failed${NC}"
        return 1
    fi
}

# Function to test generate-report
test_generate_report() {
    echo -e "${YELLOW}📊 Testing generate-report function...${NC}"
    
    local payload='{
        "companyId": "'$SAMPLE_COMPANY_ID'",
        "userId": "'$SAMPLE_USER_ID'",
        "tier": "ENHANCED"
    }'
    
    echo "Payload: $payload"
    
    local response=$(curl -s -X POST "$BASE_URL/generate-report" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -d "$payload")
    
    echo "Response: $response"
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ generate-report test passed${NC}"
        return 0
    else
        echo -e "${RED}❌ generate-report test failed${NC}"
        return 1
    fi
}

# Function to test send-emails
test_send_emails() {
    echo -e "${YELLOW}📧 Testing send-emails function...${NC}"
    
    local payload='{
        "campaignId": "'$SAMPLE_CAMPAIGN_ID'",
        "immediate": true
    }'
    
    echo "Payload: $payload"
    
    local response=$(curl -s -X POST "$BASE_URL/send-emails" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -d "$payload")
    
    echo "Response: $response"
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ send-emails test passed${NC}"
        return 0
    else
        echo -e "${RED}❌ send-emails test failed${NC}"
        return 1
    fi
}

# Function to start local development
start_local() {
    echo -e "${BLUE}🚀 Starting local Supabase development...${NC}"
    
    if ! supabase status | grep -q "API URL"; then
        echo "Starting Supabase local development environment..."
        supabase start
    else
        echo "Supabase is already running locally"
    fi
    
    echo -e "${GREEN}✅ Local environment ready${NC}"
    echo "API URL: http://localhost:54321"
    echo "Dashboard: http://localhost:54323"
}

# Function to run all tests
run_all_tests() {
    local passed=0
    local total=3
    
    echo -e "${BLUE}🧪 Running all function tests...${NC}"
    echo ""
    
    if test_enrich_company; then
        ((passed++))
    fi
    echo ""
    
    if test_generate_report; then
        ((passed++))
    fi
    echo ""
    
    if test_send_emails; then
        ((passed++))
    fi
    echo ""
    
    echo -e "${GREEN}📊 Test Summary: ${passed}/${total} tests passed${NC}"
    
    if [ $passed -eq $total ]; then
        echo -e "${GREEN}🎉 All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}⚠️  Some tests failed. Check the errors above.${NC}"
        return 1
    fi
}

# Load environment variables if available
if [ -f "supabase/.env" ]; then
    source supabase/.env
    echo -e "${GREEN}✅ Loaded environment variables${NC}"
elif [ -f ".env.local" ]; then
    source .env.local
    echo -e "${GREEN}✅ Loaded environment variables from .env.local${NC}"
else
    echo -e "${YELLOW}⚠️  No environment file found. Some tests may fail.${NC}"
fi

# Check required tools
if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ curl not found. Please install curl.${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq not found. Please install jq for JSON parsing.${NC}"
    exit 1
fi

# Start local development if testing locally
if [ "$MODE" = "local" ]; then
    start_local
fi

echo ""

# Run tests based on function parameter
case $FUNCTION in
    "enrich-company")
        test_enrich_company
        ;;
    "generate-report")
        test_generate_report
        ;;
    "send-emails")
        test_send_emails
        ;;
    "all")
        run_all_tests
        ;;
    *)
        echo -e "${RED}❌ Unknown function: $FUNCTION${NC}"
        echo "Available functions: enrich-company, generate-report, send-emails, all"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}💡 Tips:${NC}"
echo "• Use 'supabase logs --follow' to watch function logs"
echo "• Check the Supabase dashboard for more detailed logs"
echo "• Test with real data once your database is set up"