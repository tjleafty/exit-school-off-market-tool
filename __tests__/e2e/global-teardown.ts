import { FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...')
  
  try {
    // 1. Clean up temporary test data
    console.log('🗑️  Removing temporary test data...')
    
    // Clean up temporary users created during tests
    const tempUserPattern = '%test-temp-%'
    
    // Get temporary user IDs first
    const { data: tempUsers } = await supabase
      .from('users')
      .select('id')
      .like('email', tempUserPattern)

    if (tempUsers && tempUsers.length > 0) {
      const tempUserIds = tempUsers.map(user => user.id)
      
      // Clean up related data for temporary users
      await supabase
        .from('invitations')
        .delete()
        .in('user_id', tempUserIds)

      await supabase
        .from('companies')
        .delete()
        .in('user_id', tempUserIds)

      await supabase
        .from('searches')
        .delete()
        .in('user_id', tempUserIds)

      await supabase
        .from('campaigns')
        .delete()
        .in('user_id', tempUserIds)

      await supabase
        .from('email_logs')
        .delete()
        .in('user_id', tempUserIds)

      // Finally delete the temporary users
      await supabase
        .from('users')
        .delete()
        .in('id', tempUserIds)

      console.log(`🗑️  Cleaned up ${tempUsers.length} temporary test users`)
    }

    // 2. Clean up test files and artifacts
    console.log('📁 Cleaning up test artifacts...')
    
    const testResultsDir = path.join(process.cwd(), 'test-results')
    const downloadDir = path.join(process.cwd(), 'test-downloads')
    
    // Clean up old test results (keep last 5 runs)
    if (fs.existsSync(testResultsDir)) {
      const entries = fs.readdirSync(testResultsDir, { withFileTypes: true })
      const directories = entries
        .filter(entry => entry.isDirectory())
        .map(entry => ({
          name: entry.name,
          path: path.join(testResultsDir, entry.name),
          created: fs.statSync(path.join(testResultsDir, entry.name)).ctime
        }))
        .sort((a, b) => b.created.getTime() - a.created.getTime())

      // Keep only the 5 most recent directories
      const oldDirectories = directories.slice(5)
      for (const dir of oldDirectories) {
        try {
          fs.rmSync(dir.path, { recursive: true, force: true })
          console.log(`🗑️  Removed old test result: ${dir.name}`)
        } catch (error) {
          console.warn(`⚠️  Could not remove ${dir.name}:`, error)
        }
      }
    }

    // Clean up download artifacts
    if (fs.existsSync(downloadDir)) {
      try {
        fs.rmSync(downloadDir, { recursive: true, force: true })
        console.log('🗑️  Cleaned up test downloads')
      } catch (error) {
        console.warn('⚠️  Could not clean download directory:', error)
      }
    }

    // 3. Generate test summary report
    console.log('📊 Generating test summary...')
    
    const reportData = {
      timestamp: new Date().toISOString(),
      cleanup: {
        temporaryUsersRemoved: tempUsers?.length || 0,
        testArtifactsCleanedUp: true,
      },
      environment: {
        supabaseUrl: process.env.SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'unknown',
        testDuration: process.env.TEST_START_TIME 
          ? Date.now() - parseInt(process.env.TEST_START_TIME)
          : null
      }
    }

    const reportsDir = path.join(process.cwd(), 'test-results', 'reports')
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }

    const reportPath = path.join(reportsDir, `cleanup-${Date.now()}.json`)
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2))

    // 4. Verify cleanup
    console.log('✅ Verifying cleanup...')
    
    const { data: remainingTempUsers } = await supabase
      .from('users')
      .select('count')
      .like('email', tempUserPattern)

    if (remainingTempUsers && remainingTempUsers.length > 0) {
      console.warn(`⚠️  Warning: ${remainingTempUsers.length} temporary users still remain`)
    }

    // 5. Performance metrics (if available)
    if (global.testMetrics) {
      console.log('📈 Test Performance Metrics:')
      console.log(`   Total tests: ${global.testMetrics.totalTests || 'N/A'}`)
      console.log(`   Passed: ${global.testMetrics.passed || 'N/A'}`)
      console.log(`   Failed: ${global.testMetrics.failed || 'N/A'}`)
      console.log(`   Duration: ${global.testMetrics.duration || 'N/A'}ms`)
    }

    console.log('✅ E2E test environment cleanup complete!')
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    // Don't exit with error code as this might prevent CI from reporting results
    console.warn('⚠️  Continuing despite cleanup errors...')
  }
}

export default globalTeardown