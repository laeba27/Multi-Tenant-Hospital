# Setup Instructions

## Project Created Successfully! ✅

The Smile Returns Hospital Management System has been initialized with:
- ✅ Next.js 15 with App Router
- ✅ TailwindCSS and shadcn/ui components
- ✅ Supabase authentication setup
- ✅ Zod validation schemas
- ✅ Complete folder structure
- ✅ Authentication pages (sign-in, sign-up)
- ✅ Custom hooks for user and permissions

## Next Steps

### 1. Create Supabase Account (5 minutes)

1. Go to [supabase.com](https://supabase.com)
2. Sign up with email or GitHub
3. Create a new project:
   - **Project Name**: `smile-returns`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to you
4. Wait for project to initialize

### 2. Get Supabase Credentials (2 minutes)

1. In Supabase dashboard, go to **Project Settings** (gear icon)
2. Go to **API** tab
3. Copy these values:
   - **Project URL** (under `Service role key` section)
   - **Anon Key** (under `Anon public` key)

### 3. Update Environment Variables (1 minute)

1. Open `.env.local` in the project
2. Replace placeholders with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Set Up Database Schema (5 minutes)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy-paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Click **Run**
5. Verify tables are created in **Table Editor**

### 5. Create Cloudinary Account (5 minutes)

1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up for free account
3. Go to **Dashboard**
4. Copy:
   - **Cloud Name**
   - **API Key** and **API Secret**
5. Paste in `.env.local`

### 6. Test the Application (2 minutes)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

You should see:
- Landing page with Sign In / Register buttons
- Click "Register Hospital" to sign up
- Fill in hospital details
- Verify email in Supabase (or skip for testing)
- Sign in with your credentials

## Current Project Status

### Completed (Day 1 Morning)
- ✅ Next.js project structure
- ✅ TailwindCSS setup
- ✅ shadcn/ui components (button, card, input, select, dialog, table, etc.)
- ✅ Supabase client configuration
- ✅ Authentication pages (sign-in, sign-up)
- ✅ Validation schemas with Zod
- ✅ Custom hooks (useUser, useHospital, usePermissions)
- ✅ Configuration files (roles, navigation)
- ✅ Utility functions (formatting, styling)

### Ready for Next (Day 1 Afternoon)
- [ ] Database migrations execution
- [ ] RLS policies testing
- [ ] API endpoints for core features
- [ ] Dashboard layouts

## File Structure Overview

```
smile-returns/
├── src/
│   ├── app/
│   │   ├── layout.js                 # Root layout with Sonner Toast
│   │   ├── page.js                   # Landing page
│   │   ├── auth/
│   │   │   ├── layout.js             # Centered auth layout
│   │   │   ├── sign-in/page.js       # ✅ Built
│   │   │   └── sign-up/page.js       # ✅ Built (hospital registration)
│   │   ├── dashboards/               # Role-based dashboards (to build)
│   │   └── api/                      # API endpoints (to build)
│   ├── components/
│   │   ├── ui/                       # ✅ shadcn/ui components
│   │   ├── features/                 # Feature components (to build)
│   │   └── layout/                   # Layout components (to build)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.js            # ✅ Browser client
│   │   │   └── server.js            # ✅ Server client
│   │   ├── validations/
│   │   │   └── schemas.js           # ✅ Zod schemas
│   │   └── utils/
│   │       └── index.js             # ✅ Helper functions
│   ├── hooks/
│   │   ├── use-user.js              # ✅ Get current user
│   │   ├── use-hospital.js          # ✅ Get hospital data
│   │   └── use-permissions.js       # ✅ RBAC checker
│   ├── config/
│   │   ├── roles.js                 # ✅ Role definitions
│   │   └── navigation.js            # ✅ Navigation per role
│   └── globals.css                   # ✅ TailwindCSS styles
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # ✅ Database schema
├── .env.local                        # Environment variables (fill in)
├── .env.local.example                # ✅ Template
├── package.json                      # ✅ Dependencies
└── README.md                         # ✅ Documentation
```

## Database Schema (Ready to Deploy)

Tables created by migration:
- **hospitals** - Multi-tenant hospital records
- **users** - User profiles with role and hospital_id
- **RLS Policies** - Data isolation per hospital

Ready for next tables:
- departments
- doctors
- patients
- appointments
- prescriptions
- billing
- payments
- inventory
- medical_records

## Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

## Troubleshooting

### `Module not found` errors
- Ensure environment variables are set in `.env.local`
- Run `npm install` again

### Supabase connection issues
- Verify SUPABASE_URL and ANON_KEY in `.env.local`
- Check Supabase project is running in dashboard

### Build fails
- Run `npm run lint` to check for errors
- Clear `.next` folder: `rm -rf .next`
- Run `npm run build` again

## Next: Build Day 1 Afternoon

When ready, we'll:
1. Create doctor dashboard layout
2. Build appointment booking API
3. Create appointments management UI
4. Set up patient registration
5. Add prescription management

See [ONE_WEEK_BUILD_PLAN.md](../docs/ONE_WEEK_BUILD_PLAN.md) for detailed timeline.

## Support

- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- TailwindCSS: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com
