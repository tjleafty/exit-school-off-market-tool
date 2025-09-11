#!/bin/bash
# setup-repo.sh - Exit School Off-Market Tool Setup Script

echo "🚀 Setting up Exit School Off-Market Tool repository..."

# Create Next.js app (if not exists)
if [ ! -f "package.json" ]; then
    echo "Creating Next.js app..."
    npx create-next-app@latest exit-school-off-market-tool \
      --typescript \
      --tailwind \
      --app \
      --no-src-dir \
      --import-alias "@/*"
    
    cd exit-school-off-market-tool
fi

echo "📦 Installing core dependencies..."

# Install Supabase packages
npm install @supabase/supabase-js @supabase/ssr

# Install state management and data fetching
npm install @tanstack/react-query @tanstack/react-query-devtools

# Install email functionality
npm install resend react-email @react-email/components

# Install form and validation
npm install zod react-hook-form @hookform/resolvers

# Install utility packages
npm install date-fns recharts lucide-react

# Install development dependencies
npm install --save-dev @types/node

echo "🎨 Setting up shadcn/ui..."

# Initialize shadcn/ui
npx shadcn-ui@latest init -d

# Install essential components
npx shadcn-ui@latest add button card dialog form input label select \
  table tabs toast alert badge checkbox dropdown-menu \
  skeleton

echo "📁 Creating project structure..."

# Create directory structure
mkdir -p app/\(public\) app/\(user\) app/\(admin\) app/api
mkdir -p components lib supabase/migrations supabase/functions
mkdir -p .github/workflows prompts scripts

echo "🔧 Setting up configuration files..."

# Create environment example
cat > .env.local.example << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Resend Configuration
RESEND_API_KEY=your_resend_api_key

# OpenAI Configuration (for AI reports)
OPENAI_API_KEY=your_openai_api_key
EOF

echo "📄 Adding package.json scripts..."

# Add useful scripts to package.json
npm pkg set scripts.type-check="tsc --noEmit"
npm pkg set scripts.db:generate="supabase gen types typescript --local > lib/database.types.ts"
npm pkg set scripts.db:reset="supabase db reset"
npm pkg set scripts.db:push="supabase db push"

echo "🔄 Initializing git repository..."

if [ ! -d ".git" ]; then
    git init
    git add .
    git commit -m "Initial Next.js + Supabase setup

🤖 Generated with Exit School setup script

Co-Authored-By: Claude <noreply@anthropic.com>"
fi

echo "📋 Setup complete! Next steps:"
echo "1. Copy .env.local.example to .env.local and add your keys"
echo "2. Set up Supabase project and run migrations"
echo "3. Deploy to Vercel and configure environment variables"
echo "4. Create GitHub repository: gh repo create exit-school-off-market-tool --private --source=. --remote=origin --push"

echo "✅ Exit School Off-Market Tool setup complete!"