# Migration from PCF Control to Independent Web App - Overview

**Date:** December 11, 2025  
**Project:** Kazinex Unified Reports  
**Current State:** PCF Control for PowerApps with Dataverse  
**Target State:** Independent Web App on Vercel

---

## Executive Summary

This document outlines the comprehensive analysis and recommendations for migrating the Kazinex Unified Reports PCF control from a PowerApps/Dataverse environment to an independent web application deployed on Vercel.

---

## Current Implementation Analysis

### Architecture Overview
- **Framework:** PowerApps Component Framework (PCF)
- **UI Library:** React 17
- **Grid Implementation:** Custom grid with PowerAppsGridWrapper
- **Database:** Microsoft Dataverse (CDS)
- **Reporting:** SSRS (SQL Server Reporting Services) for paginated reports
- **Deployment:** PowerApps environment

### Key Components
1. **DataverseService** - Handles all WebAPI interactions with Dataverse
2. **Custom Grid** - Excel-like grid with:
   - Cell editing (text, number, percent, date, lookup, image)
   - Copy/paste functionality
   - Image upload and compression
   - Row operations (add, delete, bulk operations)
   - Multi-section/tab support
3. **Entity Structure:**
   - `reportslice` - Main report container
   - `reportsection` - Report tabs/sections
   - `reportstructure` - Column definitions
   - `reportdata` - Actual data rows

### Current Features
- ✅ Dynamic column configuration
- ✅ Excel-like cell editing
- ✅ Image upload with compression
- ✅ Copy from previous slice functionality
- ✅ Batch save operations
- ✅ Multi-tab interface
- ✅ Lookup field support
- ✅ Real-time validation

---

## Migration Challenges & Solutions

### Challenge 1: Database Migration from Dataverse

#### Current State
- Microsoft Dataverse (Common Data Service)
- OData-based WebAPI
- Built-in authentication via PowerApps
- Entity relationships and business logic

#### Recommended Solution: **Supabase** (PostgreSQL)

**Why Supabase?**
1. **PostgreSQL Database** - Enterprise-grade, reliable
2. **Real-time Capabilities** - Built-in WebSocket support
3. **REST & GraphQL APIs** - Auto-generated from schema
4. **Row-Level Security** - Fine-grained access control
5. **Storage** - Built-in file storage for images
6. **Authentication** - Multiple providers out of the box
7. **Edge Functions** - Serverless functions for complex logic
8. **Vercel Integration** - Perfect deployment compatibility
9. **Free Tier** - Generous limits for development
10. **Migration Path** - Easy data export/import

**Alternative Options:**
- **PostgreSQL on Render/Railway** - More control, similar to Dataverse
- **PlanetScale** (MySQL) - Excellent for relational data
- **MongoDB Atlas** - If you prefer NoSQL
- **Azure SQL Database** - If staying in Microsoft ecosystem

**Recommended: Supabase** ⭐
- Best balance of features, pricing, and Vercel integration
- Similar capabilities to Dataverse (RBAC, real-time, storage)

---

### Challenge 2: SSRS Report Replacement

#### Current State
- SQL Server Reporting Services (SSRS)
- Paginated reports
- Export to PDF, Excel, etc.

#### Recommended Solutions:

**Option 1: React-based PDF Generation** ⭐ (Recommended for Integration)
```
Libraries:
- @react-pdf/renderer - React components → PDF
- jsPDF + html2canvas - HTML → PDF
- pdfmake - Document definition → PDF
```
**Pros:**
- Seamless integration with your React app
- Real-time preview
- Customizable templates
- No external dependencies
- Free

**Cons:**
- More development effort
- Need to recreate report layouts

---

**Option 2: Dedicated Reporting Service**

a) **Crystal Reports Server / SAP BusinessObjects**
- Enterprise-grade
- Complex layouts
- $$$ Expensive

b) **Metabase** (Open Source) ⭐
- SQL-based reports
- Interactive dashboards
- Self-hosted or cloud
- FREE (open source) / Paid (cloud)

c) **Retool** 
- Low-code report builder
- Database connections
- $$ Moderate pricing

d) **Apache Superset**
- Open source
- Business intelligence
- Self-hosted
- FREE

---

**Option 3: Cloud Reporting APIs**

a) **DocRaptor** / **PDFShift**
- HTML → PDF API
- Simple integration
- $ Usage-based pricing

b) **Carbone.io**
- Template-based reporting
- Multiple formats
- $$ Moderate pricing

---

**Recommendation for Your Use Case:**

**Phase 1 (MVP):** Use **@react-pdf/renderer** + **Ant Design Pro Table**
- Quick implementation
- No additional cost
- Integrated with your app
- Good for standard reports

**Phase 2 (Advanced):** Add **Metabase** (self-hosted on Vercel/Railway)
- For complex analytics
- Ad-hoc queries
- Dashboards
- Still free if self-hosted

---

### Challenge 3: PowerApps Integration

#### Requirement
Continue using PowerApps while having independent web app

#### Solution: **Dual Architecture**

**Option 1: API-First Approach** ⭐
```
PowerApps → API (Vercel/Supabase) → Shared Database
Web App → API (Vercel/Supabase) → Shared Database
```

**Implementation:**
1. Build REST API on Vercel (Next.js API routes)
2. Both PowerApps and Web App consume same API
3. Shared authentication (Azure AD B2C / Supabase Auth)

**Option 2: Keep Separate but Synchronized**
```
PowerApps → Dataverse
Web App → Supabase
Background Sync → Keep data synchronized
```

**Pros:**
- PowerApps remains unchanged
- Web app fully independent
- Gradual migration possible

**Cons:**
- Data duplication
- Sync complexity

**Recommendation:** **Option 1 - API-First** ⭐
- Single source of truth
- PowerApps can call custom APIs
- Easier long-term maintenance

---

## Cost Analysis

### Current (PowerApps + Dataverse)
- PowerApps licenses: ~$20-40/user/month
- Dataverse storage: Included (up to limit)
- SSRS: Included with SQL Server

### Proposed (Vercel + Supabase)

**Development/Small Team:**
- Vercel Pro: $20/month (or Free for hobby)
- Supabase Pro: $25/month (or Free for startup)
- Domain: $12/year
- **Total: ~$45-65/month** (vs $20-40/user/month)

**Production/Enterprise:**
- Vercel Team: $20/month/member
- Supabase Team: $599/month (includes support)
- CDN costs: Variable
- **Total: ~$620+/month** (fixed, not per-user)

**Break-even:** ~15-30 users (depends on PowerApps licensing)

---

## Risk Assessment

### High Risks
1. ❗ **Data Migration** - Complex entity relationships
2. ❗ **Authentication/Authorization** - Recreating RBAC
3. ❗ **Report Fidelity** - Matching SSRS output

### Medium Risks
1. ⚠️ **PowerApps Integration** - API compatibility
2. ⚠️ **Performance** - Large datasets in web app
3. ⚠️ **User Training** - New interface

### Low Risks
1. ℹ️ **Deployment** - Vercel is reliable
2. ℹ️ **UI Components** - Ant Design is mature

---

## Migration Strategy

### Phase 1: Foundation (2-3 weeks)
- Set up Vercel project
- Create Supabase database
- Migrate schema from Dataverse
- Build REST API layer
- Basic authentication

### Phase 2: Core Features (3-4 weeks)
- Implement Ant Design Pro Table grid
- Cell editing functionality
- Data CRUD operations
- Image upload/storage
- Basic reporting

### Phase 3: Advanced Features (2-3 weeks)
- Copy/paste from Excel
- Bulk operations
- PDF generation
- PowerApps API integration
- Performance optimization

### Phase 4: Testing & Rollout (2 weeks)
- Data migration scripts
- User acceptance testing
- Documentation
- Phased rollout

**Total Timeline: 9-12 weeks**

---

## Next Steps

1. ✅ Review this document and approve approach
2. 📋 Create detailed grid requirements (next document)
3. 🔍 Research best grid library (Ant Design Pro Table vs alternatives)
4. 🏗️ Set up proof of concept
5. 📊 Design database schema in Supabase
6. 🚀 Begin Phase 1 implementation

---

## Questions to Address

1. **Users:** How many concurrent users expected?
2. **Data Volume:** How many records per report?
3. **PowerApps:** Critical to maintain integration?
4. **SSRS:** Which reports are most critical?
5. **Timeline:** When is target go-live date?
6. **Budget:** What is budget for cloud services?

---

*Next Document: 02-Grid-Implementation-Research.md*
