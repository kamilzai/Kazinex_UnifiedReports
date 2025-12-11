# Domain Strategy and Technical Architecture

**Date:** December 11, 2025  
**Project:** Kazinex Unified Reports - Independent Web App

---

## Domain Strategy

### Current Setup
- **Primary Domain:** `www.kazinex.com`
- **Existing App:** `app.kazinex.com`

### Recommended Approach: **Use Subdomain** ⭐

**Option 1: Separate Subdomain** (RECOMMENDED)
```
reports.kazinex.com
```

**Pros:**
- ✅ Clear separation of concerns
- ✅ Independent deployment
- ✅ Easier to manage SSL/CDN
- ✅ Can use different tech stack
- ✅ Better for testing (reports-dev.kazinex.com, reports-staging.kazinex.com)
- ✅ Future-proof (can move to different hosting)

**Cons:**
- Need separate DNS record
- Need separate SSL cert (Let's Encrypt free, auto-managed by Vercel)

---

**Option 2: Shared Domain with Path**
```
app.kazinex.com/reports
```

**Pros:**
- Single domain to manage
- Share SSL certificate
- Easier user navigation (same domain)

**Cons:**
- ❌ Tighter coupling with existing app
- ❌ Potential routing conflicts
- ❌ Harder to deploy independently
- ❌ Can't use Vercel's automatic subdomain features easily

---

### **RECOMMENDATION: `reports.kazinex.com`** ⭐⭐⭐⭐⭐

**Reasoning:**
1. Your existing app is on `app.kazinex.com`
2. This is a **completely different application** with different purpose
3. Subdomain allows **independent lifecycle**:
   - Deploy without affecting existing app
   - Different release schedules
   - Easier rollback if issues
4. Better for **environments**:
   - `reports-dev.kazinex.com` - Development
   - `reports-staging.kazinex.com` - Staging/UAT
   - `reports.kazinex.com` - Production

---

## DNS Configuration

### Setup for `reports.kazinex.com`

#### 1. In Your DNS Provider (GoDaddy, Cloudflare, etc.)

```
Type: CNAME
Name: reports
Value: cname.vercel-dns.com
TTL: Auto
```

#### 2. In Vercel Dashboard

1. Go to project settings
2. Domains → Add Domain
3. Enter: `reports.kazinex.com`
4. Vercel will verify and issue SSL automatically

**Result:** 
- `https://reports.kazinex.com` → Your app
- SSL certificate auto-renewed by Vercel
- Global CDN included

---

### Environment URLs

**Development:**
```
Local: http://localhost:3000
Preview: https://kazinex-reports-git-develop.vercel.app
Staging: https://reports-staging.kazinex.com
```

**Production:**
```
https://reports.kazinex.com
```

---

## Technical Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   User Browser                           │
│              reports.kazinex.com                         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                 Vercel Edge Network (CDN)                │
│  - SSL/TLS Termination                                  │
│  - DDoS Protection                                       │
│  - Global Edge Caching                                   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│          Next.js App (App Router) - Vercel              │
│  ┌─────────────────────────────────────────────────┐   │
│  │  app/                                            │   │
│  │  ├── (auth)/                                     │   │
│  │  │   ├── login/                                  │   │
│  │  │   └── register/                               │   │
│  │  ├── (dashboard)/                                │   │
│  │  │   ├── layout.tsx     - Sidebar, header       │   │
│  │  │   ├── page.tsx       - Dashboard home        │   │
│  │  │   ├── reports/       - Reports list          │   │
│  │  │   ├── report/[id]/   - Report view/edit      │   │
│  │  │   └── admin/         - Admin section         │   │
│  │  │       ├── designs/   - Report designs        │   │
│  │  │       ├── sections/  - Section templates     │   │
│  │  │       └── structures/ - Column definitions   │   │
│  │  └── api/                                        │   │
│  │      ├── auth/                                   │   │
│  │      ├── reports/                                │   │
│  │      ├── designs/                                │   │
│  │      ├── sections/                               │   │
│  │      ├── structures/                             │   │
│  │      ├── data/                                   │   │
│  │      └── lookups/                                │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL + Storage)            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Database (PostgreSQL 15)                       │   │
│  │  ├── report_designs                             │   │
│  │  ├── report_sections                            │   │
│  │  ├── report_structures                          │   │
│  │  ├── report_slices                              │   │
│  │  ├── report_data (EAV)                          │   │
│  │  ├── report_structure_lookups                   │   │
│  │  ├── projects                                    │   │
│  │  └── users, roles (auth.users)                  │   │
│  │                                                   │   │
│  │  Storage Buckets                                │   │
│  │  └── report-images/                             │   │
│  │      ├── {userId}/{reportId}/{imageId}.jpg      │   │
│  │      └── thumbnails/                            │   │
│  │                                                   │   │
│  │  Edge Functions (Optional)                      │   │
│  │  └── image-processing/                          │   │
│  │                                                   │   │
│  │  Realtime (Optional)                            │   │
│  │  └── Collaborative editing                      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack Decisions

### Frontend

**Framework:** Next.js 14 (App Router) ⭐⭐⭐⭐⭐
```
Why:
- Server-side rendering (SSR) for SEO and performance
- API routes for backend (no separate server needed)
- File-based routing (intuitive)
- React Server Components (faster)
- Built-in optimization (images, fonts, etc.)
- Perfect Vercel integration
- TypeScript support
```

**UI Library:** Ant Design 5.x ⭐⭐⭐⭐⭐
```
Why:
- Professional, enterprise-grade components
- Comprehensive component library
- Excellent documentation
- TypeScript support
- Customizable theming
- Pro Components for advanced features
- Active maintenance
- Used by Alibaba, Tencent, etc.
```

**Grid:** AG Grid Community ⭐⭐⭐⭐⭐
```
Why:
- Best Excel-like experience
- Native copy/paste from Excel
- Free and open source
- Can upgrade to Enterprise if needed
- Perfect for data-heavy applications
- Virtual scrolling (handles millions of rows)
- Customizable (can style to match Ant Design)
```

**State Management:** Zustand + React Query ⭐⭐⭐⭐
```
Zustand:
- Lightweight (1KB)
- Simple API
- TypeScript support
- No boilerplate

React Query (TanStack Query):
- Server state management
- Automatic caching
- Background refetching
- Optimistic updates
- Perfect for API calls
```

**Forms:** React Hook Form + Zod ⭐⭐⭐⭐⭐
```
React Hook Form:
- Minimal re-renders
- Easy validation
- TypeScript support

Zod:
- Runtime validation
- Type inference
- Schema-based
```

**Styling:** Tailwind CSS + Ant Design ⭐⭐⭐⭐
```
Tailwind:
- Utility-first
- Small bundle size
- Customizable
- Works well with Ant Design
```

---

### Backend & Database

**Database:** Supabase (PostgreSQL 15) ⭐⭐⭐⭐⭐
```
Why:
- PostgreSQL (battle-tested, reliable)
- Auto-generated REST API
- Row-Level Security (RLS)
- Storage for images
- Realtime capabilities
- Authentication built-in
- Edge Functions for complex logic
- Excellent documentation
- Free tier generous
- Perfect Vercel integration
```

**API:** Next.js API Routes ⭐⭐⭐⭐⭐
```
Why:
- Same codebase as frontend
- TypeScript end-to-end
- Easy deployment (Vercel)
- Middleware support
- Edge runtime option
```

**Authentication:** Supabase Auth ⭐⭐⭐⭐⭐
```
Why:
- Built into Supabase
- Multiple providers (email, OAuth, SAML)
- JWT tokens
- Row-Level Security integration
- Easy to use
- Free
```

**File Storage:** Supabase Storage ⭐⭐⭐⭐⭐
```
Why:
- Integrated with database
- CDN included
- Access policies
- Image transformation (resize, compress)
- Free tier: 1GB
- Paid: $0.021/GB/month
```

---

### Development Tools

**Version Control:** GitHub ⭐⭐⭐⭐⭐
```
- Already using
- Vercel auto-deploys from Git
- GitHub Actions for CI/CD
```

**Deployment:** Vercel ⭐⭐⭐⭐⭐
```
- Automatic deployments from Git
- Preview deployments for PRs
- Global CDN
- Edge functions
- Analytics included
- Free for hobby, $20/mo for Pro
```

**Monitoring:**
```
- Vercel Analytics (free with Pro)
- Sentry for error tracking ($26/mo)
- Supabase Dashboard for DB monitoring
```

**Testing:**
```
- Jest for unit tests
- React Testing Library
- Playwright for E2E tests
- MSW for API mocking
```

---

## Project Structure

```
kazinex-reports-web/
├── .github/
│   └── workflows/
│       ├── ci.yml           - Run tests on PR
│       └── deploy.yml       - Deploy to staging/prod
├── app/
│   ├── (auth)/              - Auth routes (no layout)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/         - Main app routes (with layout)
│   │   ├── layout.tsx       - Sidebar + header
│   │   ├── page.tsx         - Dashboard home
│   │   ├── reports/
│   │   │   ├── page.tsx     - Reports list
│   │   │   └── new/
│   │   │       └── page.tsx - Create new report
│   │   ├── report/
│   │   │   └── [id]/
│   │   │       ├── page.tsx - View/edit report
│   │   │       └── loading.tsx
│   │   └── admin/           - Admin section
│   │       ├── layout.tsx   - Admin layout
│   │       ├── designs/     - Report designs
│   │       ├── sections/    - Section templates
│   │       └── structures/  - Column definitions
│   ├── api/                 - API routes
│   │   ├── auth/
│   │   │   └── [...supabase]/
│   │   │       └── route.ts
│   │   ├── reports/
│   │   │   ├── route.ts     - GET /api/reports, POST /api/reports
│   │   │   └── [id]/
│   │   │       ├── route.ts - GET, PATCH, DELETE /api/reports/:id
│   │   │       ├── sections/
│   │   │       └── data/
│   │   ├── designs/
│   │   ├── sections/
│   │   ├── structures/
│   │   └── lookups/
│   ├── layout.tsx           - Root layout
│   ├── page.tsx             - Home/landing
│   ├── globals.css
│   └── providers.tsx        - Context providers
├── components/
│   ├── ui/                  - Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Modal.tsx
│   ├── report/              - Report-specific components
│   │   ├── ReportGrid/
│   │   │   ├── ReportGrid.tsx
│   │   │   ├── CellEditors/
│   │   │   └── Toolbar.tsx
│   │   ├── ReportTabs/
│   │   └── ReportHeader/
│   └── admin/               - Admin components
│       ├── DesignBuilder/
│       ├── SectionBuilder/
│       └── StructureBuilder/
├── lib/
│   ├── supabase/
│   │   ├── client.ts        - Browser client
│   │   ├── server.ts        - Server client
│   │   └── middleware.ts    - Auth middleware
│   ├── stores/              - Zustand stores
│   │   ├── authStore.ts
│   │   ├── reportStore.ts
│   │   └── uiStore.ts
│   ├── hooks/               - Custom hooks
│   │   ├── useReport.ts
│   │   ├── useReportData.ts
│   │   └── useAuth.ts
│   └── utils/               - Utility functions
│       ├── dataTransformers.ts
│       ├── validation.ts
│       └── formatters.ts
├── services/                - API services
│   ├── reportService.ts
│   ├── designService.ts
│   ├── dataService.ts
│   └── imageService.ts
├── types/
│   ├── database.types.ts    - Generated from Supabase
│   ├── report.types.ts
│   └── api.types.ts
├── public/
│   ├── images/
│   └── icons/
├── __tests__/               - Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.local               - Local environment variables
├── .env.example             - Example environment variables
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
├── package.json
└── README.md
```

---

## Environment Variables

### `.env.local` (Development)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Optional
NEXT_PUBLIC_ENVIRONMENT=development
```

### Production (Vercel)
```bash
# Set in Vercel Dashboard → Settings → Environment Variables

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=https://reports.kazinex.com
NEXT_PUBLIC_API_URL=https://reports.kazinex.com/api

# Optional
NEXT_PUBLIC_ENVIRONMENT=production
```

---

## Security Architecture

### Row-Level Security (RLS)

**Principle:** Users can only access data they own or have permission to see.

```sql
-- Example: Users can only see reports in their projects
CREATE POLICY "Users can view their project reports"
  ON report_slices FOR SELECT
  USING (
    project_id IN (
      SELECT project_id 
      FROM user_projects 
      WHERE user_id = auth.uid()
    )
  );

-- Admin users can see all
CREATE POLICY "Admins can view all reports"
  ON report_slices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### API Security

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const supabase = createMiddlewareClient({ req, res });
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  // Check authorization (role-based)
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();
    
    if (userRole?.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }
  
  return NextResponse.next();
}
```

---

## Performance Optimizations

### 1. **Server Components (Default in App Router)**
```typescript
// app/reports/page.tsx
// This runs on server, no JS sent to client
async function ReportsPage() {
  const reports = await getReports(); // Fetches on server
  
  return (
    <ReportsList reports={reports} /> // Only data sent to client
  );
}
```

### 2. **Image Optimization**
```typescript
import Image from 'next/image';

<Image
  src="/report-logo.png"
  alt="Logo"
  width={200}
  height={100}
  priority // Load immediately
/>
```

### 3. **Database Indexes**
```sql
-- Critical indexes for performance
CREATE INDEX idx_report_data_section_slice ON report_data(section_id, slice_id);
CREATE INDEX idx_report_data_row ON report_data(section_id, slice_id, row_number);
CREATE INDEX idx_report_structures_section ON report_structures(section_id, sort_order);
```

### 4. **API Caching**
```typescript
// React Query automatic caching
const { data: reports } = useQuery({
  queryKey: ['reports', projectId],
  queryFn: () => fetchReports(projectId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

## Deployment Strategy

### Git Workflow

```
main (production)      → reports.kazinex.com
  ↑
staging                → reports-staging.kazinex.com
  ↑
develop                → Auto preview URLs
  ↑
feature/xyz            → Auto preview URLs
```

### Deployment Process

**1. Development:**
```bash
git checkout -b feature/new-feature
# Make changes
git push origin feature/new-feature
# Open PR to develop
# Vercel creates preview URL automatically
```

**2. Staging:**
```bash
# Merge to staging
git checkout staging
git merge develop
git push origin staging
# Deploys to reports-staging.kazinex.com
```

**3. Production:**
```bash
# After testing on staging
git checkout main
git merge staging
git push origin main
# Deploys to reports.kazinex.com
```

---

## Monitoring & Logging

### 1. **Vercel Analytics**
- Page views
- Web Vitals (LCP, FID, CLS)
- API response times
- Error rates

### 2. **Sentry (Error Tracking)**
```typescript
// sentry.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
  tracesSampleRate: 0.1,
});
```

### 3. **Supabase Dashboard**
- Database performance
- Query analytics
- Storage usage
- API usage

### 4. **Custom Logging**
```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, meta?: object) => {
    console.log(JSON.stringify({ level: 'info', message, meta, timestamp: new Date() }));
  },
  error: (message: string, error: Error, meta?: object) => {
    console.error(JSON.stringify({ level: 'error', message, error: error.message, stack: error.stack, meta, timestamp: new Date() }));
    Sentry.captureException(error);
  },
};
```

---

## Next Steps

1. ✅ Review architecture decisions
2. 🔨 Set up GitHub repository (if new)
3. 🌐 Configure DNS for `reports.kazinex.com`
4. 🗄️ Create Supabase project
5. 🚀 Create Vercel project
6. 📝 Move to [02-Database-Schema.md](02-Database-Schema.md)

---

*Next: Database Schema Implementation*
