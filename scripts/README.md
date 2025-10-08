# User Management Scripts

This directory contains scripts for managing users in the Exit School application.

## Bulk User Import

Use the `import-users.js` script to create multiple users from a CSV file.

### Usage

```bash
# Basic usage with default password (ChangeMe123!)
node scripts/import-users.js path/to/users.csv

# Specify a custom password for all users
node scripts/import-users.js path/to/users.csv --password=CustomPassword123
```

### CSV Format

Your CSV file must have a header row with the following columns:

- **email** (required): User's email address
- **full_name** (required): User's full name
- **company_name** (optional): User's company name
- **role** (optional): USER or ADMIN (defaults to USER)

#### Example CSV:

```csv
email,full_name,company_name,role
john.doe@company.com,John Doe,ACME Corporation,USER
jane.admin@company.com,Jane Smith,Exit School,ADMIN
bob@startup.com,Bob Johnson,Tech Startup,USER
```

A template file is provided at `scripts/users-template.csv`

### Features

- ✅ Validates all users before creating any
- ✅ Skips users that already exist
- ✅ Creates both auth users and user profiles
- ✅ Sets default password for all new users
- ✅ Provides detailed progress and summary
- ✅ Handles errors gracefully
- ✅ Prevents duplicate users

### Output

The script provides:
- Real-time progress for each user
- Validation errors before starting
- Summary of successful, skipped, and failed imports
- List of all created users

### Notes

- All imported users are set to ACTIVE status
- Email verification is automatically confirmed
- Users should change their password on first login
- Failed profile creations automatically clean up auth users
- Default password: `ChangeMe123!` (or custom via --password flag)

## Other Scripts

- `create-admin.js` - Create a single admin user
- `check-admin.js` - Verify admin user exists and has correct permissions
