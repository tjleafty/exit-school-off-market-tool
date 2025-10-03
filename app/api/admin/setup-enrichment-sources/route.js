import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST() {
  try {
    console.log('Setting up enrichment sources table...')

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '007_enrichment_sources.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`Executing ${statements.length} SQL statements...`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`Executing statement ${i + 1}/${statements.length}`)

      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        })

        if (error) {
          // If exec_sql RPC doesn't exist, try direct execution
          console.warn('exec_sql RPC not found, trying alternative approach')

          // For CREATE TYPE, CREATE TABLE, CREATE INDEX, INSERT statements
          // We'll need to use the direct query method
          const result = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ query: statement })
          })

          if (!result.ok) {
            const errorText = await result.text()
            console.error(`Statement ${i + 1} failed:`, errorText)
            // Continue with other statements
          }
        }
      } catch (err) {
        console.error(`Error executing statement ${i + 1}:`, err)
        // Continue with other statements
      }
    }

    // Verify the table was created by checking if we can query it
    const { data, error } = await supabase
      .from('enrichment_sources')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Verification failed:', error)
      return NextResponse.json({
        success: false,
        message: 'Migration executed but verification failed',
        error: error.message,
        note: 'Please run the migration manually using Supabase SQL Editor'
      })
    }

    console.log('✓ Enrichment sources table created successfully')

    return NextResponse.json({
      success: true,
      message: 'Enrichment sources table created successfully',
      sources: data
    })

  } catch (error) {
    console.error('Error setting up enrichment sources:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      note: 'Please run the migration manually using Supabase SQL Editor',
      migrationFile: 'supabase/migrations/007_enrichment_sources.sql'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Check if table exists by trying to query it
    const { data, error } = await supabase
      .from('enrichment_sources')
      .select('*')
      .limit(1)

    if (error) {
      return NextResponse.json({
        exists: false,
        message: 'Enrichment sources table does not exist',
        error: error.message
      })
    }

    return NextResponse.json({
      exists: true,
      message: 'Enrichment sources table exists',
      sample: data
    })

  } catch (error) {
    return NextResponse.json({
      exists: false,
      error: error.message
    })
  }
}
