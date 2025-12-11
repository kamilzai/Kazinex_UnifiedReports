# Kazinex Unified Reports

Enterprise reporting platform built with Next.js 14, Supabase, and AG Grid.

## 🚀 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL)
- **UI Library:** Ant Design 5.x
- **Grid:** AG Grid Community
- **State Management:** Zustand + React Query
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## 📋 Features

- ✅ Excel-like grid editing with AG Grid
- ✅ Multi-section reports with tabs
- ✅ Admin UI for managing report templates
- ✅ Image uploads with compression
- ✅ Copy data from previous reports
- ✅ Export to Excel, CSV, PDF
- ✅ Row-level security with Supabase
- ✅ Real-time collaboration

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Supabase account
- Vercel account (for deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/kamilzai/Kazinex_UnifiedReports.git
cd Kazinex_UnifiedReports
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/             # Admin panel
│   │   ├── reports/           # Reports pages
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── admin/            # Admin components
│   │   ├── reports/          # Report components
│   │   └── shared/           # Shared components
│   ├── lib/                   # Utilities and helpers
│   │   ├── supabase/         # Supabase clients
│   │   └── utils/            # Utility functions
│   ├── store/                 # Zustand stores
│   ├── types/                 # TypeScript types
│   └── schemas/               # Zod validation schemas
├── Design/                    # Design documents
│   ├── Reserarch/            # Research documents
│   └── implementation-plan/  # Implementation plan
└── KazinexUnifiedReport/      # Legacy PCF control (reference)
```

## 🗃️ Database Setup

See [Design/implementation-plan/02-Database-Schema.md](Design/implementation-plan/02-Database-Schema.md) for complete database schema.

1. Create a new Supabase project
2. Run the migration script from the database schema document
3. Enable Row-Level Security policies
4. Create storage bucket for images

## 📚 Documentation

- [Implementation Plan](Design/implementation-plan/)
- [Database Schema](Design/implementation-plan/02-Database-Schema.md)
- [Admin UI Spec](Design/implementation-plan/03-Admin-UI-Specification.md)
- [User UI Spec](Design/implementation-plan/04-User-UI-Specification.md)

## 🚀 Deployment

The app is configured for automatic deployment to Vercel:

1. Push to `main` branch
2. Vercel automatically builds and deploys
3. Set environment variables in Vercel dashboard

**Production URL:** https://kazinex-unified-reports.vercel.app

## 📝 License

Private - Kazinex Internal Use Only

## 👥 Team

- Development: Kazinex Development Team

---

**Status:** 🚧 In Development