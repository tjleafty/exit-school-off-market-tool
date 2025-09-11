#!/bin/bash

# Deploy Edge Functions to Supabase
# Usage: ./scripts/deploy-functions.sh [function-name]

set -e

echo "🚀 Deploying Supabase Edge Functions..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Please install it first:${NC}"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're logged in
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Supabase. Please run:${NC}"
    echo "supabase login"
    exit 1
fi

# Function to deploy a specific function
deploy_function() {
    local func_name=$1
    echo -e "${YELLOW}📦 Deploying function: ${func_name}${NC}"
    
    if [ ! -d "supabase/functions/${func_name}" ]; then
        echo -e "${RED}❌ Function directory not found: supabase/functions/${func_name}${NC}"
        return 1
    fi
    
    if supabase functions deploy ${func_name} --project-ref ${SUPABASE_PROJECT_ID:-$(supabase projects list --output json | jq -r '.[0].id')}; then
        echo -e "${GREEN}✅ Successfully deployed: ${func_name}${NC}"
        
        # Set environment variables for the function
        set_function_secrets ${func_name}
        
        return 0
    else
        echo -e "${RED}❌ Failed to deploy: ${func_name}${NC}"
        return 1
    fi
}

# Function to set secrets for a deployed function
set_function_secrets() {
    local func_name=$1
    echo -e "${YELLOW}🔐 Setting secrets for: ${func_name}${NC}"
    
    # Check if .env file exists
    if [ ! -f "supabase/.env" ]; then
        echo -e "${YELLOW}⚠️  No .env file found. Skipping secrets setup.${NC}"
        echo -e "${YELLOW}   Create supabase/.env with your API keys to enable secrets.${NC}"
        return 0
    fi
    
    # Source the .env file to get variables
    source supabase/.env
    
    # Set common secrets that all functions need
    if [ -n "$SUPABASE_URL" ]; then
        supabase secrets set SUPABASE_URL="$SUPABASE_URL" --project-ref ${SUPABASE_PROJECT_ID:-$(supabase projects list --output json | jq -r '.[0].id')} &> /dev/null || true
    fi
    
    if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" --project-ref ${SUPABASE_PROJECT_ID:-$(supabase projects list --output json | jq -r '.[0].id')} &> /dev/null || true
    fi
    
    # Function-specific secrets
    case $func_name in
        "generate-report")
            if [ -n "$OPENAI_API_KEY" ]; then
                supabase secrets set OPENAI_API_KEY="$OPENAI_API_KEY" --project-ref ${SUPABASE_PROJECT_ID:-$(supabase projects list --output json | jq -r '.[0].id')} &> /dev/null || true
            fi
            ;;
        "enrich-company")
            if [ -n "$HUNTER_API_KEY" ]; then
                supabase secrets set HUNTER_API_KEY="$HUNTER_API_KEY" --project-ref ${SUPABASE_PROJECT_ID:-$(supabase projects list --output json | jq -r '.[0].id')} &> /dev/null || true
            fi
            if [ -n "$APOLLO_API_KEY" ]; then
                supabase secrets set APOLLO_API_KEY="$APOLLO_API_KEY" --project-ref ${SUPABASE_PROJECT_ID:-$(supabase projects list --output json | jq -r '.[0].id')} &> /dev/null || true
            fi
            if [ -n "$ZOOMINFO_API_KEY" ]; then
                supabase secrets set ZOOMINFO_API_KEY="$ZOOMINFO_API_KEY" --project-ref ${SUPABASE_PROJECT_ID:-$(supabase projects list --output json | jq -r '.[0].id')} &> /dev/null || true
            fi
            ;;
        "send-emails")
            if [ -n "$RESEND_API_KEY" ]; then
                supabase secrets set RESEND_API_KEY="$RESEND_API_KEY" --project-ref ${SUPABASE_PROJECT_ID:-$(supabase projects list --output json | jq -r '.[0].id')} &> /dev/null || true
            fi
            ;;
    esac
    
    echo -e "${GREEN}✅ Secrets configured for: ${func_name}${NC}"
}

# Function to deploy all functions
deploy_all() {
    local functions=("enrich-company" "generate-report" "send-emails")
    local success_count=0
    local total_count=${#functions[@]}
    
    for func in "${functions[@]}"; do
        if deploy_function $func; then
            ((success_count++))
        fi
        echo ""
    done
    
    echo -e "${GREEN}📊 Deployment Summary: ${success_count}/${total_count} functions deployed successfully${NC}"
    
    if [ $success_count -eq $total_count ]; then
        echo -e "${GREEN}🎉 All functions deployed successfully!${NC}"
        echo ""
        echo -e "${YELLOW}📝 Next steps:${NC}"
        echo "1. Test your functions using the Supabase dashboard"
        echo "2. Update your application to call these functions"
        echo "3. Set up cron jobs for automated email campaigns"
        return 0
    else
        echo -e "${RED}⚠️  Some functions failed to deploy. Check the errors above.${NC}"
        return 1
    fi
}

# Main deployment logic
if [ $# -eq 0 ]; then
    # No arguments, deploy all functions
    deploy_all
else
    # Deploy specific function
    deploy_function $1
fi

echo ""
echo -e "${GREEN}🔗 Useful commands:${NC}"
echo "supabase functions list    # List all deployed functions"
echo "supabase logs --follow     # Watch function logs"
echo "supabase secrets list      # View configured secrets"