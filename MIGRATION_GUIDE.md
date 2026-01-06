# Deploying Schema Migration to Supabase

Since you've modified the migration file, you need to push it to Supabase. Here are the steps:

## Option 1: Using Supabase CLI (Recommended)

```bash
# Navigate to the project
cd /Users/laebafirdous/Desktop/webdev/multi-tenent-hospital/smile-returns

# If Supabase CLI is not installed:
npm install -g supabase

# Link to your Supabase project (first time only)
supabase link

# Push the migration
supabase db push
```

## Option 2: Manual SQL in Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy the entire content of `supabase/migrations/001_initial_schema.sql`
6. Paste it into the SQL editor
7. Click **Run**

## Option 3: Check Current Database State

Before running the migration, verify:

```bash
# Check if tables already exist
supabase db list

# Or check in dashboard: Database > Tables
```

## What the Migration Does

1. Creates `hospitals` table with all hospital details
2. Creates `profiles` table linked to auth.users
3. Creates indexes for performance
4. **Disables RLS policies** (for development)

## After Deployment

Once the migration is deployed:
1. The signup form should work end-to-end
2. Auth user → Hospital entry → Profile entry will be created
3. You can test registration at `http://localhost:3000/auth/sign-up`

## Common Issues

**Error: "relation already exists"**
- Drop the tables first in Supabase dashboard or run:
  ```sql
  DROP TABLE IF EXISTS profiles CASCADE;
  DROP TABLE IF EXISTS hospitals CASCADE;
  ```
- Then run the migration again

**Error: "infinite recursion detected"**
- This should be fixed now since RLS is disabled
- If still occurring, re-run the drop and migration steps above

## Next: RLS Policies (Phase 2)

Once registration is working, we'll re-enable RLS with proper policies:
- Hospital admins see only their hospital
- Profiles are only visible to the user themselves
- Super admins can see all data
