#!/usr/bin/env node

/**
 * Database Backup Script
 * Creates backups of the Supabase database
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Tables to backup (in order of dependencies)
const TABLES = [
  'users',
  'searches', 
  'companies',
  'enrichments',
  'email_templates',
  'campaigns',
  'outreach_targets',
  'reports',
  'email_logs',
  'invitations',
  'audit_logs',
  'daily_reports'
]

async function backupTable(tableName) {
  console.log(`📦 Backing up table: ${tableName}`)
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error(`❌ Error backing up ${tableName}:`, error.message)
      return null
    }
    
    console.log(`✅ Backed up ${data?.length || 0} records from ${tableName}`)
    return {
      table: tableName,
      records: data?.length || 0,
      data: data || []
    }
    
  } catch (error) {
    console.error(`❌ Exception backing up ${tableName}:`, error.message)
    return null
  }
}

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(process.cwd(), 'backups')
  
  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
  
  console.log('🔄 Starting database backup...')
  console.log('=' .repeat(50))
  
  const backup = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: process.env.SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'unknown',
    tables: {}
  }
  
  let totalRecords = 0
  
  // Backup each table
  for (const tableName of TABLES) {
    const tableBackup = await backupTable(tableName)
    if (tableBackup) {
      backup.tables[tableName] = tableBackup
      totalRecords += tableBackup.records
    }
  }
  
  // Save backup to file
  const filename = `backup-${timestamp}.json`
  const filepath = path.join(backupDir, filename)
  
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2))
  
  // Create metadata file
  const metadataFilename = `backup-${timestamp}.meta.json`
  const metadataFilepath = path.join(backupDir, metadataFilename)
  
  const metadata = {
    filename,
    timestamp: backup.timestamp,
    totalRecords,
    totalTables: Object.keys(backup.tables).length,
    size: fs.statSync(filepath).size,
    tables: Object.keys(backup.tables).map(tableName => ({
      name: tableName,
      records: backup.tables[tableName].records
    }))
  }
  
  fs.writeFileSync(metadataFilepath, JSON.stringify(metadata, null, 2))
  
  console.log('=' .repeat(50))
  console.log('✅ Backup completed successfully!')
  console.log('')
  console.log('📊 Backup Summary:')
  console.log(`📁 File: ${filename}`)
  console.log(`📏 Size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`)
  console.log(`📋 Tables: ${metadata.totalTables}`)
  console.log(`📄 Records: ${totalRecords}`)
  console.log(`📅 Created: ${new Date(backup.timestamp).toLocaleString()}`)
  
  return filepath
}

async function listBackups() {
  const backupDir = path.join(process.cwd(), 'backups')
  
  if (!fs.existsSync(backupDir)) {
    console.log('📂 No backups directory found')
    return []
  }
  
  const files = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.meta.json'))
    .sort()
    .reverse() // Most recent first
  
  console.log('📋 Available Backups:')
  console.log('=' .repeat(70))
  
  if (files.length === 0) {
    console.log('No backups found')
    return []
  }
  
  files.forEach((file, index) => {
    const metadataPath = path.join(backupDir, file)
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
      
      console.log(`${index + 1}. ${metadata.filename}`)
      console.log(`   📅 ${new Date(metadata.timestamp).toLocaleString()}`)
      console.log(`   📏 ${(metadata.size / 1024 / 1024).toFixed(2)} MB`)
      console.log(`   📋 ${metadata.totalTables} tables, ${metadata.totalRecords} records`)
      console.log('')
    } catch (error) {
      console.log(`❌ Error reading metadata for ${file}`)
    }
  })
  
  return files
}

async function restoreBackup(backupFile) {
  const backupDir = path.join(process.cwd(), 'backups')
  const backupPath = path.join(backupDir, backupFile)
  
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup file not found: ${backupFile}`)
    return false
  }
  
  console.log('🔄 Starting database restore...')
  console.log(`📁 From: ${backupFile}`)
  console.log('⚠️  WARNING: This will overwrite existing data!')
  console.log('=' .repeat(50))
  
  try {
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
    
    console.log(`📅 Backup from: ${new Date(backup.timestamp).toLocaleString()}`)
    console.log(`📋 Tables to restore: ${Object.keys(backup.tables).length}`)
    
    // Restore each table
    for (const tableName of TABLES) {
      if (!backup.tables[tableName]) {
        console.log(`⏭️  Skipping ${tableName} (not in backup)`)
        continue
      }
      
      const tableData = backup.tables[tableName]
      
      if (tableData.data.length === 0) {
        console.log(`⏭️  Skipping ${tableName} (no data)`)
        continue
      }
      
      console.log(`🔄 Restoring ${tableName} (${tableData.records} records)`)
      
      // Clear existing data (optional - you might want to comment this out)
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records
      
      if (deleteError && !deleteError.message.includes('No rows')) {
        console.warn(`⚠️  Warning clearing ${tableName}:`, deleteError.message)
      }
      
      // Insert backup data in chunks to avoid timeout
      const chunkSize = 100
      for (let i = 0; i < tableData.data.length; i += chunkSize) {
        const chunk = tableData.data.slice(i, i + chunkSize)
        
        const { error: insertError } = await supabase
          .from(tableName)
          .insert(chunk)
        
        if (insertError) {
          console.error(`❌ Error restoring ${tableName} chunk ${Math.floor(i/chunkSize) + 1}:`, insertError.message)
          return false
        }
      }
      
      console.log(`✅ Restored ${tableName}`)
    }
    
    console.log('=' .repeat(50))
    console.log('✅ Restore completed successfully!')
    return true
    
  } catch (error) {
    console.error('❌ Restore failed:', error.message)
    return false
  }
}

// Main function
async function main() {
  const command = process.argv[2]
  const arg = process.argv[3]
  
  switch (command) {
    case 'create':
    case 'backup':
      await createBackup()
      break
      
    case 'list':
      await listBackups()
      break
      
    case 'restore':
      if (!arg) {
        console.error('❌ Please specify backup file to restore')
        console.log('Usage: npm run db:backup restore backup-2023-12-13T10-30-00-000Z.json')
        process.exit(1)
      }
      await restoreBackup(arg)
      break
      
    default:
      console.log(`
🗄️  Database Backup Tool

Usage: npm run db:backup <command> [args]

Commands:
  create, backup    Create a new backup
  list             List available backups
  restore <file>   Restore from backup file

Examples:
  npm run db:backup create
  npm run db:backup list  
  npm run db:backup restore backup-2023-12-13T10-30-00-000Z.json

Backups are stored in the ./backups/ directory.
`)
      break
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})

// Run the script
main()