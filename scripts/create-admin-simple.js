#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function createAdminUserSimple() {
  console.log('🚀 Creating Admin User (Simple Method)...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('URL:', supabaseUrl)
  console.log('Service key exists:', !!serviceRoleKey)

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    console.log('\n1. Creating auth user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@exitschool.com',
      password: 'password',
      email_confirm: true,
      user_metadata: {
        full_name: 'System Administrator',
        company_name: 'Exit School'
      }
    })

    console.log('Auth result:', { data: authData?.user?.id, error: authError })

    if (authError) {
      console.error('❌ Auth creation failed:', authError.message)
      return false
    }

    if (!authData?.user) {
      console.error('❌ No user returned from auth creation')
      return false
    }

    console.log('✅ Auth user created:', authData.user.id)

    // Wait a moment for triggers to complete
    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log('\n2. Checking if profile was auto-created...')
    const { data: existingProfile, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking profile:', checkError.message)
    }

    if (existingProfile) {
      console.log('✅ Profile exists, updating to admin...')
      const { error: updateError } = await supabase
        .from('users')
        .update({
          role: 'ADMIN',
          status: 'ACTIVE',
          full_name: 'System Administrator',
          company_name: 'Exit School',
          email_verified: true,
        })
        .eq('id', authData.user.id)

      if (updateError) {
        console.error('❌ Update failed:', updateError.message)
        return false
      }
      console.log('✅ Profile updated to admin')
    } else {
      console.log('⚠️  No profile found, creating manually...')
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: 'admin@exitschool.com',
          full_name: 'System Administrator',
          company_name: 'Exit School',
          role: 'ADMIN',
          status: 'ACTIVE',
          email_verified: true,
        })

      if (insertError) {
        console.error('❌ Manual profile creation failed:', insertError.message)
        return false
      }
      console.log('✅ Profile created manually')
    }

    console.log('\n3. Final verification...')
    const { data: finalProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    console.log('Final profile:', {
      id: finalProfile?.id,
      email: finalProfile?.email,
      role: finalProfile?.role,
      status: finalProfile?.status
    })

    if (finalProfile?.role === 'ADMIN' && finalProfile?.status === 'ACTIVE') {
      console.log('\n🎉 SUCCESS! Admin user created and configured!')
      console.log('\n📝 Login Credentials:')
      console.log('   Email: admin@exitschool.com')
      console.log('   Password: password')
      console.log('\nYou can now sign in to your application! 🚀')
      return true
    } else {
      console.error('❌ Final verification failed')
      return false
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

createAdminUserSimple().then(success => {
  process.exit(success ? 0 : 1)
})