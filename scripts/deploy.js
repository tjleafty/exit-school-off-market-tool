#!/usr/bin/env node

/**
 * Deployment Automation Script
 * Automates deployment process with environment promotion and health checks
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

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

function execCommand(command, description) {
  log('blue', `🔄 ${description}...`)
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' })
    log('green', `✅ ${description} completed`)
    return output
  } catch (error) {
    log('red', `❌ ${description} failed: ${error.message}`)
    throw error
  }
}

async function runHealthCheck(url) {
  log('blue', `🏥 Running health check on ${url}...`)
  
  try {
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      headers: { 'User-Agent': 'Deploy-Script/1.0' }
    })
    
    if (response.ok) {
      log('green', '✅ Health check passed')
      return true
    } else {
      log('red', `❌ Health check failed: ${response.status}`)
      return false
    }
  } catch (error) {
    log('red', `❌ Health check error: ${error.message}`)
    return false
  }
}

async function waitForDeployment(url, maxAttempts = 10) {
  log('blue', `⏳ Waiting for deployment to be ready...`)
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Deploy-Script/1.0' }
      })
      
      if (response.ok) {
        log('green', `✅ Deployment ready after ${attempt} attempt(s)`)
        return true
      }
    } catch (error) {
      // Expected during deployment
    }
    
    if (attempt < maxAttempts) {
      log('yellow', `⏳ Attempt ${attempt}/${maxAttempts} - waiting 30 seconds...`)
      await new Promise(resolve => setTimeout(resolve, 30000))
    }
  }
  
  log('red', `❌ Deployment not ready after ${maxAttempts} attempts`)
  return false
}

async function backupDatabase() {
  log('cyan', '📦 Creating database backup before deployment...')
  
  try {
    execCommand('node scripts/backup.js create', 'Database backup')
    return true
  } catch (error) {
    log('yellow', '⚠️  Database backup failed, continuing with deployment')
    return false
  }
}

async function runMigrations() {
  log('cyan', '🗄️  Running database migrations...')
  
  try {
    execCommand('npx supabase db push', 'Database migrations')
    return true
  } catch (error) {
    log('red', '❌ Database migrations failed')
    throw error
  }
}

async function runTests() {
  log('cyan', '🧪 Running test suite...')
  
  try {
    execCommand('npm run test:ci', 'Test suite')
    return true
  } catch (error) {
    log('red', '❌ Tests failed')
    throw error
  }
}

async function buildProject() {
  log('cyan', '🔨 Building project...')
  
  try {
    execCommand('npm run build', 'Project build')
    return true
  } catch (error) {
    log('red', '❌ Build failed')
    throw error
  }
}

async function deployToVercel(environment = 'preview') {
  log('cyan', `🚀 Deploying to ${environment}...`)
  
  const deployCommand = environment === 'production' 
    ? 'npx vercel --prod' 
    : 'npx vercel'
  
  try {
    const output = execCommand(deployCommand, `Vercel ${environment} deployment`)
    
    // Extract URL from output
    const urlMatch = output.match(/https:\/\/[^\s]+/)
    const deploymentUrl = urlMatch ? urlMatch[0] : null
    
    if (!deploymentUrl) {
      throw new Error('Could not extract deployment URL')
    }
    
    log('green', `🌐 Deployment URL: ${deploymentUrl}`)
    return deploymentUrl
  } catch (error) {
    log('red', `❌ ${environment} deployment failed`)
    throw error
  }
}

async function promoteToProduction(previewUrl) {
  log('cyan', '🎯 Promoting to production...')
  
  // Wait for user confirmation
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  return new Promise((resolve) => {
    readline.question(`\n🤔 Promote ${previewUrl} to production? (yes/no): `, (answer) => {
      readline.close()
      
      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        log('green', '✅ Proceeding with production deployment')
        resolve(true)
      } else {
        log('yellow', '⏸️  Production deployment cancelled')
        resolve(false)
      }
    })
  })
}

async function notifyDeployment(environment, url, success) {
  const status = success ? '✅ Success' : '❌ Failed'
  const timestamp = new Date().toISOString()
  
  const deploymentLog = {
    timestamp,
    environment,
    url,
    success,
    branch: process.env.VERCEL_GIT_COMMIT_REF || 'unknown',
    commit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
  }
  
  // Save deployment log
  const logsDir = path.join(process.cwd(), 'logs')
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }
  
  const logFile = path.join(logsDir, `deployment-${timestamp.replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(logFile, JSON.stringify(deploymentLog, null, 2))
  
  log('blue', `📝 Deployment log saved: ${path.relative(process.cwd(), logFile)}`)
  
  // TODO: Add Slack/Discord webhook notification here if configured
  if (process.env.WEBHOOK_URL) {
    try {
      await fetch(process.env.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Deployment ${status}: ${environment} - ${url}`,
          timestamp,
          details: deploymentLog
        })
      })
      log('green', '📢 Notification sent')
    } catch (error) {
      log('yellow', '⚠️  Failed to send notification')
    }
  }
}

// Main deployment functions
async function deployPreview() {
  log('magenta', '🔧 Starting Preview Deployment')
  log('magenta', '='.repeat(50))
  
  try {
    await runTests()
    await buildProject()
    
    const deploymentUrl = await deployToVercel('preview')
    
    await waitForDeployment(deploymentUrl)
    const healthy = await runHealthCheck(deploymentUrl)
    
    await notifyDeployment('preview', deploymentUrl, healthy)
    
    if (healthy) {
      log('green', '🎉 Preview deployment completed successfully!')
      log('green', `🌐 Preview URL: ${deploymentUrl}`)
    } else {
      log('yellow', '⚠️  Preview deployed but health check failed')
    }
    
    return deploymentUrl
  } catch (error) {
    await notifyDeployment('preview', null, false)
    log('red', `❌ Preview deployment failed: ${error.message}`)
    process.exit(1)
  }
}

async function deployProduction() {
  log('magenta', '🚀 Starting Production Deployment')
  log('magenta', '='.repeat(50))
  
  try {
    // Extra safety checks for production
    await backupDatabase()
    await runTests()
    await buildProject()
    
    // Deploy to preview first for final validation
    log('blue', '🔍 Deploying to preview for final validation...')
    const previewUrl = await deployToVercel('preview')
    await waitForDeployment(previewUrl)
    const previewHealthy = await runHealthCheck(previewUrl)
    
    if (!previewHealthy) {
      throw new Error('Preview deployment health check failed')
    }
    
    // Get confirmation to promote
    const shouldPromote = await promoteToProduction(previewUrl)
    if (!shouldPromote) {
      return
    }
    
    // Run migrations before production deployment
    await runMigrations()
    
    // Deploy to production
    const productionUrl = await deployToVercel('production')
    
    await waitForDeployment(productionUrl, 15) // More time for production
    const healthy = await runHealthCheck(productionUrl)
    
    await notifyDeployment('production', productionUrl, healthy)
    
    if (healthy) {
      log('green', '🎉 Production deployment completed successfully!')
      log('green', `🌐 Production URL: ${productionUrl}`)
    } else {
      throw new Error('Production deployment health check failed')
    }
    
  } catch (error) {
    await notifyDeployment('production', null, false)
    log('red', `❌ Production deployment failed: ${error.message}`)
    process.exit(1)
  }
}

async function rollback() {
  log('magenta', '↩️  Starting Rollback Process')
  log('magenta', '='.repeat(50))
  
  try {
    // List recent deployments
    const deployments = execCommand('npx vercel ls', 'Fetching recent deployments')
    console.log('\n📋 Recent Deployments:')
    console.log(deployments)
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    return new Promise((resolve) => {
      readline.question('\n🔄 Enter deployment URL to rollback to: ', async (url) => {
        readline.close()
        
        if (!url) {
          log('yellow', '⏸️  Rollback cancelled')
          return resolve(false)
        }
        
        try {
          // Promote the specified deployment
          execCommand(`npx vercel promote ${url}`, 'Promoting deployment')
          
          await waitForDeployment(url)
          const healthy = await runHealthCheck(url)
          
          await notifyDeployment('rollback', url, healthy)
          
          if (healthy) {
            log('green', '✅ Rollback completed successfully!')
          } else {
            log('yellow', '⚠️  Rollback completed but health check failed')
          }
          
          resolve(true)
        } catch (error) {
          log('red', `❌ Rollback failed: ${error.message}`)
          resolve(false)
        }
      })
    })
  } catch (error) {
    log('red', `❌ Rollback process failed: ${error.message}`)
    process.exit(1)
  }
}

async function deploymentStatus() {
  log('cyan', '📊 Deployment Status')
  log('cyan', '='.repeat(50))
  
  try {
    // Current deployments
    const deployments = execCommand('npx vercel ls --limit 10', 'Fetching deployments')
    console.log('\n📋 Recent Deployments:')
    console.log(deployments)
    
    // Check current production health
    try {
      const productionUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'
      await runHealthCheck(productionUrl)
    } catch (error) {
      log('yellow', '⚠️  Could not check production health (URL not configured)')
    }
    
    // Recent deployment logs
    const logsDir = path.join(process.cwd(), 'logs')
    if (fs.existsSync(logsDir)) {
      const logFiles = fs.readdirSync(logsDir)
        .filter(file => file.startsWith('deployment-'))
        .sort()
        .reverse()
        .slice(0, 5)
      
      if (logFiles.length > 0) {
        console.log('\n📝 Recent Deployment Logs:')
        logFiles.forEach(file => {
          const logPath = path.join(logsDir, file)
          const log = JSON.parse(fs.readFileSync(logPath, 'utf8'))
          const status = log.success ? '✅' : '❌'
          console.log(`${status} ${log.timestamp} - ${log.environment} - ${log.url || 'Failed'}`)
        })
      }
    }
    
  } catch (error) {
    log('red', `❌ Status check failed: ${error.message}`)
  }
}

// Main function
async function main() {
  const command = process.argv[2]
  
  switch (command) {
    case 'preview':
      await deployPreview()
      break
      
    case 'production':
    case 'prod':
      await deployProduction()
      break
      
    case 'rollback':
      await rollback()
      break
      
    case 'status':
      await deploymentStatus()
      break
      
    default:
      console.log(`
🚀 Deployment Automation Script

Usage: npm run deploy <command>

Commands:
  preview     - Deploy to preview environment with tests and health checks
  production  - Deploy to production with full safety checks
  rollback    - Rollback to a previous deployment
  status      - Show deployment status and recent logs

Examples:
  npm run deploy preview
  npm run deploy production
  npm run deploy rollback
  npm run deploy status

Safety Features:
  - Automated testing before deployment
  - Database backups before production deploys
  - Health checks after deployment
  - Preview deployment validation before production
  - Rollback capabilities
  - Deployment logging and notifications

Environment Variables:
  - WEBHOOK_URL: Optional webhook for deployment notifications
  - NEXT_PUBLIC_APP_URL: Production URL for health checks
`)
      break
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Deployment cancelled')
  process.exit(0)
})

// Run the script
main()