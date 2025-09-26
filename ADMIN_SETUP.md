# Admin User Setup Guide

Since the automatic admin creation script requires the Supabase service role key, here are two ways to set up your admin user:

## Option 1: Automatic Setup (Recommended)

### Step 1: Get Your Service Role Key
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ibhjrxejiyvaiflfsufb)
2. Click **Settings** → **API** in the left sidebar
3. Copy the **`service_role`** key (NOT the anon key)

### Step 2: Update Environment Variables
Edit your `.env.local` file:
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_actual_service_role_key
```

### Step 3: Run the Admin Creation Script
```bash
npm run create-admin
```

This will create the admin user with:
- **Email:** `admin@exitschool.com`
- **Password:** `password`

---

## Option 2: Manual Setup (If Service Key Not Available)

### Step 1: Create Admin User in Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ibhjrxejiyvaiflfsufb)
2. Click **Authentication** → **Users** in the left sidebar
3. Click **Add User** button
4. Fill in the form:
   - **Email:** `admin@exitschool.com`
   - **Password:** `password`
   - **Email Confirmed:** ✅ Check this box
   - **Phone Confirmed:** Leave unchecked
5. Click **Create User**

### Step 2: Set User Role to Admin

1. Go to **Database** → **Table Editor** in the left sidebar
2. Select the **`users`** table
3. Click **Insert** → **Insert row**
4. Fill in the user profile:
   ```
   id: [Copy the user ID from the auth.users table]
   email: admin@exitschool.com
   full_name: System Administrator
   company_name: Exit School
   role: ADMIN
   status: ACTIVE
   email_verified: true
   created_at: [Current timestamp]
   updated_at: [Current timestamp]
   ```
5. Click **Save**

### Step 3: Test Login

1. Go to your deployed application
2. Click **Sign In**
3. Use credentials:
   - **Email:** `admin@exitschool.com`
   - **Password:** `password`
4. You should see the dashboard with admin features

---

## Verification

After creating the admin user (either method), you should be able to:

1. ✅ Access the application at your Vercel URL
2. ✅ See the login page
3. ✅ Sign in with admin credentials
4. ✅ View the dashboard with admin badges
5. ✅ See admin-only sections (User Management, System Settings)

## Troubleshooting

### "Invalid API key" Error
- Your `SUPABASE_SERVICE_ROLE_KEY` is incorrect or missing
- Make sure you copied the **service_role** key, not the anon key
- Check that there are no extra spaces in the `.env.local` file

### "User already exists" Error  
- The admin user was already created
- Try logging in with the existing credentials
- Check the Supabase auth users table to verify

### "Account pending approval" Message
- The user exists but the profile wasn't created properly
- Check the `users` table and ensure `status` is `ACTIVE` and `role` is `ADMIN`

### Login Redirects to Signup
- User profile doesn't exist in the `users` table
- Follow Option 2, Step 2 to create the profile manually

---

## Next Steps

Once the admin user is set up:

1. **Deploy Latest Changes**: Make sure your latest frontend code is deployed
2. **Test Full Flow**: Sign in → Dashboard → Admin features
3. **Create Additional Users**: Use the admin account to approve other users
4. **Configure Settings**: Set up integrations and system settings

The authentication system is now ready for production use!