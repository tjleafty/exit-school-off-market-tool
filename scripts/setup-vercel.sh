#!/bin/bash
# setup-vercel.sh - Vercel Environment Setup for Exit School Off-Market Tool

echo "🚀 Setting up Vercel environment for Exit School Off-Market Tool..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "npm i -g vercel"
    exit 1
fi

# Link to Vercel project
echo "🔗 Linking to Vercel project..."
vercel link

# Set environment variables
echo "🔧 Setting up environment variables..."

# Supabase Configuration
echo "Setting Supabase environment variables..."
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# OpenAI API Key
echo "Setting OpenAI API key..."
vercel env add OPENAI_API_KEY production

# Email Service (Resend)
echo "Setting email service API key..."
vercel env add RESEND_API_KEY production

# Data enrichment APIs
echo "Setting data enrichment API keys..."
vercel env add GOOGLE_PLACES_API_KEY production
vercel env add HUNTER_API_KEY production
vercel env add APOLLO_API_KEY production
vercel env add ZOOMINFO_API_KEY production

echo "✅ Environment variables configured!"

# Deploy to production
echo "🚀 Deploying to production..."
vercel --prod

echo "🎉 Deployment complete! Your Exit School Off-Market Tool is now live."
echo ""
echo "Next steps:"
echo "1. Verify all environment variables are set correctly in Vercel dashboard"
echo "2. Test cron jobs are running as expected"
echo "3. Monitor function logs for any issues"
echo "4. Set up domain if needed: vercel domains add your-domain.com"
