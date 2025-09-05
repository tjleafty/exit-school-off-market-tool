#!/usr/bin/env node

/**
 * Project Setup Script
 * Initializes the project with required configurations
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function checkFile(filepath, description) {
  const exists = fs.existsSync(filepath)
  if (exists) {
    log('green', `✅ ${description}`)
  } else {
    log('red', `❌ ${description} (missing: ${filepath})`)
  }
  return exists
}

function checkEnvVar(varName, description) {
  require('dotenv').config({ path: '.env.local' })
  const exists = !!process.env[varName]
  if (exists) {
    log('green', `✅ ${description}`)
  } else {
    log('red', `❌ ${description} (missing: ${varName})`)
  }
  return exists
}

function createDirectoryIfNotExists(dirPath, description) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
    log('green', `✅ Created ${description}: ${dirPath}`)
    return true
  } else {
    log('blue', `ℹ️  ${description} already exists: ${dirPath}`)
    return false
  }
}

function copyFileIfNotExists(sourcePath, targetPath, description) {
  if (!fs.existsSync(targetPath)) {
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath)
      log('green', `✅ Created ${description}: ${targetPath}`)
      return true
    } else {
      log('yellow', `⚠️  Template not found: ${sourcePath}`)
      return false
    }
  } else {
    log('blue', `ℹ️  ${description} already exists`)
    return false
  }
}

async function setupDirectories() {
  log('cyan', '\n📁 Setting up directories...')
  
  const directories = [
    { path: 'logs', description: 'Logs directory' },
    { path: 'backups', description: 'Database backups directory' },
    { path: 'prompts/generated', description: 'Generated prompts directory' },
    { path: 'tests/__mocks__', description: 'Test mocks directory' },
    { path: 'public/images', description: 'Public images directory' }
  ]
  
  directories.forEach(({ path: dirPath, description }) => {
    createDirectoryIfNotExists(dirPath, description)
  })
}

async function setupEnvironmentFiles() {
  log('cyan', '\n🔧 Setting up environment files...')
  
  // Copy environment template if .env.local doesn't exist
  copyFileIfNotExists('.env.local.example', '.env.local', 'Environment file')
  
  // Create development environment file
  if (!fs.existsSync('.env.development')) {
    const devEnv = `# Development Environment
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Copy your production values here for development
# SUPABASE_URL=your-supabase-url
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
`
    fs.writeFileSync('.env.development', devEnv)
    log('green', '✅ Created development environment file')
  }
}

async function setupGitHooks() {
  log('cyan', '\n🪝 Setting up Git hooks...')
  
  const hooksDir = '.git/hooks'
  
  if (!fs.existsSync('.git')) {
    log('yellow', '⚠️  Not a git repository, skipping hooks setup')
    return
  }
  
  // Pre-commit hook
  const preCommitHook = `#!/bin/sh
# Pre-commit hook for Exit School Off-Market Tool

echo "🔍 Running pre-commit checks..."

# Run linting
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed. Please fix the errors and try again."
  exit 1
fi

# Run type checking
npm run type-check
if [ $? -ne 0 ]; then
  echo "❌ Type checking failed. Please fix the errors and try again."
  exit 1
fi

echo "✅ Pre-commit checks passed!"
exit 0
`
  
  const preCommitPath = path.join(hooksDir, 'pre-commit')
  if (!fs.existsSync(preCommitPath)) {
    fs.writeFileSync(preCommitPath, preCommitHook)
    fs.chmodSync(preCommitPath, '755')
    log('green', '✅ Created pre-commit hook')
  }
}

async function setupVSCodeConfig() {
  log('cyan', '\n💻 Setting up VS Code configuration...')
  
  const vscodeDir = '.vscode'
  createDirectoryIfNotExists(vscodeDir, 'VS Code directory')
  
  // Settings
  const settings = {
    "typescript.preferences.includePackageJsonAutoImports": "on",
    "typescript.suggest.autoImports": true,
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true
    },
    "files.exclude": {
      "**/node_modules": true,
      "**/.next": true,
      "**/dist": true
    },
    "search.exclude": {
      "**/node_modules": true,
      "**/.next": true,
      "**/dist": true,
      "**/logs": true,
      "**/backups": true
    }
  }
  
  const settingsPath = path.join(vscodeDir, 'settings.json')
  if (!fs.existsSync(settingsPath)) {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
    log('green', '✅ Created VS Code settings')
  }
  
  // Extensions recommendations
  const extensions = {
    "recommendations": [
      "bradlc.vscode-tailwindcss",
      "esbenp.prettier-vscode",
      "dbaeumer.vscode-eslint",
      "ms-vscode.vscode-typescript-next",
      "supabase.supabase-vscode",
      "ms-vscode.vscode-json"
    ]
  }
  
  const extensionsPath = path.join(vscodeDir, 'extensions.json')
  if (!fs.existsExists(extensionsPath)) {
    fs.writeFileSync(extensionsPath, JSON.stringify(extensions, null, 2))
    log('green', '✅ Created VS Code extensions recommendations')
  }
}

async function checkDependencies() {
  log('cyan', '\n📦 Checking dependencies...')
  
  try {
    // Check if node_modules exists
    if (!fs.existsSync('node_modules')) {
      log('yellow', '⚠️  Dependencies not installed. Running npm install...')
      execSync('npm install', { stdio: 'inherit' })
      log('green', '✅ Dependencies installed')
    } else {
      log('green', '✅ Dependencies are installed')
    }
  } catch (error) {
    log('red', `❌ Error installing dependencies: ${error.message}`)
  }
}

async function checkRequiredTools() {
  log('cyan', '\n🛠️  Checking required tools...')
  
  const tools = [
    { command: 'node --version', name: 'Node.js' },
    { command: 'npm --version', name: 'npm' },
    { command: 'git --version', name: 'Git' }
  ]
  
  tools.forEach(({ command, name }) => {
    try {
      const version = execSync(command, { encoding: 'utf8' }).trim()
      log('green', `✅ ${name}: ${version}`)
    } catch (error) {
      log('red', `❌ ${name} not found or not working`)
    }
  })
  
  // Check for Supabase CLI (optional)
  try {
    const supabaseVersion = execSync('supabase --version', { encoding: 'utf8' }).trim()
    log('green', `✅ Supabase CLI: ${supabaseVersion}`)
  } catch (error) {
    log('yellow', '⚠️  Supabase CLI not found (optional but recommended)')
    log('blue', 'ℹ️  Install with: npm install -g supabase')
  }
  
  // Check for Vercel CLI (optional)
  try {
    const vercelVersion = execSync('vercel --version', { encoding: 'utf8' }).trim()
    log('green', `✅ Vercel CLI: ${vercelVersion}`)
  } catch (error) {
    log('yellow', '⚠️  Vercel CLI not found (optional)')
    log('blue', 'ℹ️  Install with: npm install -g vercel')
  }
}

async function runSetupValidation() {
  log('cyan', '\n✅ Running setup validation...')
  
  let allGood = true
  
  // Check required files
  const requiredFiles = [
    { path: 'package.json', description: 'Package.json' },
    { path: 'next.config.js', description: 'Next.js config' },
    { path: 'tailwind.config.js', description: 'Tailwind config' },
    { path: 'tsconfig.json', description: 'TypeScript config' },
    { path: '.env.local', description: 'Environment variables' }
  ]
  
  requiredFiles.forEach(({ path, description }) => {
    if (!checkFile(path, description)) {
      allGood = false
    }
  })
  
  // Check critical environment variables
  const requiredEnvVars = [
    { name: 'SUPABASE_URL', description: 'Supabase URL' },
    { name: 'NEXT_PUBLIC_SUPABASE_URL', description: 'Public Supabase URL' },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Supabase Service Role Key' },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', description: 'Public Supabase Anon Key' }
  ]
  
  requiredEnvVars.forEach(({ name, description }) => {
    if (!checkEnvVar(name, description)) {
      allGood = false
    }
  })
  
  return allGood
}

async function main() {
  log('magenta', '🚀 Exit School Off-Market Tool - Project Setup')
  log('magenta', '=' .repeat(60))
  
  await checkRequiredTools()
  await setupDirectories()
  await setupEnvironmentFiles()
  await checkDependencies()
  await setupGitHooks()
  await setupVSCodeConfig()
  
  const isValid = await runSetupValidation()
  
  log('magenta', '=' .repeat(60))
  
  if (isValid) {
    log('green', '🎉 Project setup completed successfully!')
    log('green', '')
    log('green', 'Next steps:')
    log('green', '1. Update .env.local with your actual API keys')
    log('green', '2. Run: npm run dev (to start development server)')
    log('green', '3. Run: npm run db:generate (to generate database types)')
    log('green', '4. Run: npm run db:seed (to seed with sample data)')
    log('green', '5. Run: npm run health-check (to verify everything works)')
  } else {
    log('red', '❌ Project setup completed with issues!')
    log('red', 'Please address the missing files and environment variables above.')
  }
  
  log('blue', '')
  log('blue', 'Available commands:')
  log('blue', '  npm run dev              - Start development server')
  log('blue', '  npm run build            - Build for production')
  log('blue', '  npm run type-check       - Run TypeScript checks')
  log('blue', '  npm run lint             - Run linting')
  log('blue', '  npm run db:generate      - Generate database types')
  log('blue', '  npm run db:seed          - Seed database with sample data')
  log('blue', '  npm run health-check     - Run health checks')
  log('blue', '  npm run claude:component - Generate component with Claude')
  log('blue', '')
  log('blue', 'For more commands, check package.json scripts section.')
}

// Error handling
process.on('unhandledRejection', (error) => {
  log('red', `❌ Unhandled error: ${error.message}`)
  process.exit(1)
})

// Run setup
main()