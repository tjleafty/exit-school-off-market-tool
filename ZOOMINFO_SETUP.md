# ZoomInfo JWT Authentication Setup Guide

## The Problem

Your ZoomInfo integration was failing with **401 Unauthorized** errors because ZoomInfo uses **JWT (JSON Web Token) authentication** with a private key, NOT a simple API key like other services.

The error occurred because the system was trying to use the private key directly as a Bearer token, but ZoomInfo requires:
1. **Username** - Your ZoomInfo account username
2. **Client ID** - A unique identifier for your API application
3. **Private Key** - RSA private key used to sign JWT tokens

These three pieces are used together to generate a JWT token that expires after 1 hour.

---

## What I've Fixed

✅ **Installed ZoomInfo Auth Client**
- Added `zoominfo-api-auth-client` npm package for JWT token generation

✅ **Updated Database Schema**
- Added `username` and `client_id` columns to the `api_keys` table
- Migration file: `supabase/migrations/010_zoominfo_jwt_auth.sql`

✅ **Updated API Enrichment Code**
- Modified `/app/api/companies/enrich/route.js` to use JWT authentication
- Now generates JWT token before making API calls
- Token is automatically refreshed as needed

✅ **Updated Settings API**
- Modified `/app/api/settings/api-keys/route.js` to accept `username` and `client_id`
- Now properly stores all three ZoomInfo credentials

✅ **Updated Force-Update Tool**
- Enhanced `/app/debug/force-update-key/page.js` with Username and Client ID fields
- Shows ZoomInfo-specific instructions when selected
- Accepts multi-line private key input

---

## How to Set Up ZoomInfo

### Step 1: Get Your Credentials from ZoomInfo

1. Log in to **ZoomInfo Admin Portal**
2. Navigate to: **Admin Portal → Integrations → API & Webhooks**
3. Click **"Generate New Token"**
4. ZoomInfo will provide you with:
   - **Username** (your ZoomInfo account username)
   - **Client ID** (looks like a UUID or alphanumeric string)
   - **Private Key** (multi-line text starting with `-----BEGIN PRIVATE KEY-----`)

### Step 2: Configure in Your Application

**Option A: Use the Force-Update Tool (Recommended)**

1. Go to: `http://localhost:3000/debug/force-update-key`
2. Select **"ZoomInfo"** from the dropdown
3. Fill in all three fields:
   - **Username**: Your ZoomInfo username
   - **Client ID**: The client ID from ZoomInfo
   - **Private Key**: Copy and paste the ENTIRE private key including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers
4. Click **"Force Update API Key"**
5. You should see a success message with previews of all three credentials

**Option B: Use the Settings Page**

1. Go to: Settings → API Keys
2. Find the ZoomInfo section
3. Enter all three credentials
4. Click Save and Test

---

## Private Key Format

Your private key should look EXACTLY like this (with different characters):

```
-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCnZg60gzklL320
QsV2MwTC8UoGPqiQZx+qsely7G6Ep7G87EaJbYSdsoFOG+fUjXawBT485FJ6nQLU
[... many more lines ...]
BH5SFJR+GRZdZ7qpIaA35g==
-----END PRIVATE KEY-----
```

**IMPORTANT**: Copy the ENTIRE key including the BEGIN and END markers.

---

## How the JWT Authentication Works

1. Your **username**, **client_id**, and **private_key** are stored in the database
2. When enriching a company, the system:
   - Retrieves all three credentials
   - Calls `zoominfo-api-auth-client.getAccessTokenViaPKI(username, clientId, privateKey)`
   - Gets a JWT token valid for 1 hour
   - Uses that token in the `Authorization: Bearer {token}` header
   - Makes API calls to ZoomInfo
3. The JWT token automatically expires after 1 hour and is regenerated on the next enrichment

---

## Verification Steps

After setting up your credentials:

1. **Test the Connection**
   - Go to Settings → API Keys
   - Click "Test" next to ZoomInfo
   - Should show "Connected" status

2. **Try an Enrichment**
   - Go to Data Enrichment page
   - Select a company
   - Click "Enrich Selected Companies"
   - Check the logs for success

3. **Check Debug Endpoint** (if needed)
   - Visit: `http://localhost:3000/api/debug/zoominfo-test`
   - Should show successful API response with company data

---

## Common Errors and Solutions

### Error: "Could not deserialize key data"
**Cause**: Private key not properly formatted
**Solution**: Make sure you copied the ENTIRE key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers

### Error: "401 Unauthorized"
**Cause**: Invalid credentials (username, client_id, or private_key is wrong)
**Solution**: Double-check all three credentials in ZoomInfo Admin Portal

### Error: "ZoomInfo credentials not fully configured"
**Cause**: One or more of the three required fields is missing
**Solution**: Ensure username, client_id, AND private_key are all saved in the database

---

## Files Modified

1. `supabase/migrations/010_zoominfo_jwt_auth.sql` - Database schema update
2. `app/api/companies/enrich/route.js` - JWT authentication logic
3. `app/api/settings/api-keys/route.js` - Accept username/client_id
4. `app/api/debug/force-update-key/route.js` - Support JWT credentials
5. `app/debug/force-update-key/page.js` - UI for entering credentials
6. `package.json` - Added `zoominfo-api-auth-client` dependency

---

## Next Steps

1. ✅ Run the database migration (if using Supabase, it should auto-apply on next deploy)
2. ✅ Get your ZoomInfo credentials from the Admin Portal
3. ✅ Use the Force-Update Tool to enter all three credentials
4. ✅ Test the connection
5. ✅ Try enriching a company

Once configured, ZoomInfo enrichment should work seamlessly with Hunter.io and Apollo.io!
