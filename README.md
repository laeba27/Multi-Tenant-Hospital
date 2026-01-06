# Smile Returns - Hospital Management System

This is a multi-tenant hospital management system built with Next.js 15, Supabase, and TailwindCSS.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (https://supabase.com)
- Cloudinary account (https://cloudinary.com)

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Set up environment variables**
Copy `.env.local.example` to `.env.local` and fill in your credentials:
```bash
cp .env.local.example .env.local
```

3. **Configure Supabase**
   - Create a new Supabase project
   - Go to Project Settings → API Keys and copy:
     - Project URL
     - Anon (public) key
   - Paste these in `.env.local`

4. **Set up database**
   - In Supabase, go to SQL Editor
   - Run the migration from `supabase/migrations/001_initial_schema.sql`

5. **Configure Cloudinary**
   - Create a Cloudinary account
   - Copy your cloud name, API key, and API secret
   - Paste these in `.env.local`

## Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── auth/                # Authentication pages
│   ├── dashboards/          # Role-based dashboards
│   └── api/                 # API endpoints
├── components/              # React components
│   ├── ui/                 # shadcn/ui components
│   ├── features/           # Feature-specific components
│   └── layout/             # Layout components
├── lib/                     # Utilities and helpers
│   ├── supabase/          # Supabase clients
│   ├── validations/       # Zod schemas
│   └── utils/             # Helper functions
├── hooks/                   # Custom React hooks
└── config/                  # Configuration files
```

## Features

- **Multi-tenant Architecture**: Complete data isolation between hospitals
- **Role-Based Access Control**: 5 roles with different permissions
- **Authentication**: Email/password with Supabase Auth
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS
- **Form Validation**: Client and server-side with Zod

## Roles

- **Super Admin**: Manage all hospitals
- **Hospital Admin**: Manage departments, staff, inventory, finance
- **Doctor**: Manage appointments, patients, prescriptions
- **Reception**: Book appointments, register patients, billing
- **Patient**: View appointments, medical records, prescriptions

## Building for Production

```bash
npm run build
npm run start
```

## Deployment

Deploy to Vercel:
```bash
vercel
```

Set environment variables in Vercel dashboard before deploying.
# Multi-Tenant-Hospital
