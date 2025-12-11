# PowerApps Integration with Independent Web App

**Date:** December 11, 2025  
**Goal:** Enable PowerApps to work with independent web app and Supabase database

---

## Integration Architecture

### Scenario: Dual Access Pattern

```
┌─────────────┐         ┌──────────────────┐         ┌──────────────┐
│  PowerApps  │────────>│   Vercel API     │<────────│   Web App    │
│   Canvas    │         │   (Next.js)      │         │   (React)    │
└─────────────┘         └──────────────────┘         └──────────────┘
                               │
                               ↓
                        ┌──────────────┐
                        │   Supabase   │
                        │  PostgreSQL  │
                        └──────────────┘
```

Both PowerApps and your Web App will communicate with the same backend API.

---

## Option 1: REST API via Power Apps Connectors ⭐ RECOMMENDED

### Step 1: Create Custom Connector in PowerApps

PowerApps can connect to any REST API using Custom Connectors.

#### A. Define OpenAPI/Swagger Spec

```yaml
# api-spec.yaml
openapi: 3.0.0
info:
  title: Kazinex Reports API
  version: 1.0.0
  description: API for Kazinex Unified Reports

servers:
  - url: https://your-app.vercel.app/api
    description: Production

paths:
  /reports/slices:
    get:
      summary: Get all report slices
      operationId: getReportSlices
      responses:
        '200':
          description: List of report slices
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ReportSlice'
  
  /reports/slices/{sliceId}:
    get:
      summary: Get a specific report slice
      operationId: getReportSlice
      parameters:
        - name: sliceId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Report slice details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReportSlice'
  
  /reports/slices/{sliceId}/sections:
    get:
      summary: Get sections for a report slice
      operationId: getReportSections
      parameters:
        - name: sliceId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: List of sections
  
  /reports/sections/{sectionId}/data:
    get:
      summary: Get data for a section
      operationId: getSectionData
      parameters:
        - name: sectionId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Section data
    
    post:
      summary: Save cell data
      operationId: saveCellData
      parameters:
        - name: sectionId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                rowNumber:
                  type: integer
                columnName:
                  type: string
                value:
                  type: string
      responses:
        '200':
          description: Save successful

components:
  schemas:
    ReportSlice:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        description:
          type: string
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - BearerAuth: []
```

#### B. Import to PowerApps

1. Go to **PowerApps** > **Data** > **Custom Connectors**
2. Click **New custom connector** > **Import an OpenAPI file**
3. Upload the `api-spec.yaml`
4. Configure authentication (Bearer token)
5. Test the connector
6. Create a connection

#### C. Use in PowerApps Canvas App

```powerFx
// OnStart of App
Set(
    gblReportSlices,
    KazinexReportsAPI.getReportSlices()
);

// In a Gallery
Gallery1.Items = gblReportSlices

// On button click to load sections
Set(
    gblCurrentSections,
    KazinexReportsAPI.getReportSections(Gallery1.Selected.id)
);

// Save data
KazinexReportsAPI.saveCellData(
    gblCurrentSectionId,
    {
        rowNumber: 1,
        columnName: "account_name",
        value: TextInput1.Text
    }
);
```

---

## Option 2: Direct Database Access (Limited)

### Using Microsoft Dataverse Connector + Azure SQL Connector

If you want PowerApps to directly access the database:

**Option 2a: Keep Dataverse for PowerApps, Sync to Supabase**

```
PowerApps → Dataverse (Read/Write)
                ↕ (Sync)
Web App → Supabase (Read/Write)
```

**Sync Implementation:**
- Power Automate flow triggered on Dataverse changes
- Webhook to Vercel API to update Supabase
- Bidirectional sync

**Cons:**
- Complex sync logic
- Data duplication
- Potential sync conflicts

---

**Option 2b: PostgreSQL Direct Connection (Not Recommended)**

PowerApps can connect to SQL Server, but NOT directly to PostgreSQL without:
- Setting up ODBC drivers
- Using Azure Data Gateway
- Very complex setup

**Not recommended for your use case.**

---

## Option 3: OData API (Advanced) ⭐⭐

If you want a more standardized approach:

### Implement OData v4 Protocol

```typescript
// pages/api/odata/$metadata.ts
// OData metadata endpoint

// pages/api/odata/ReportSlices.ts
// OData entity endpoint with $filter, $select, $expand support
```

**Pros:**
- PowerApps has built-in OData connector
- Standard querying with $filter, $select, $expand
- Better performance (client-side filtering)

**Cons:**
- More complex API implementation
- Need to implement OData protocol properly

**Libraries:**
- `odata-v4-server` (Node.js)
- Manual implementation

---

## Authentication Strategy

### Challenge: PowerApps Authentication to External API

#### Solution 1: Azure AD B2C ⭐ RECOMMENDED

```
PowerApps → Azure AD B2C → Vercel API → Supabase
Web App → Azure AD B2C → Vercel API → Supabase
```

**Setup:**
1. Create Azure AD B2C tenant
2. Register PowerApps as application
3. Register Web App as application
4. Configure API permissions
5. Validate JWT tokens in Vercel API

**Vercel API Token Validation:**

```typescript
// middleware/auth.ts
import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: `https://${process.env.AZURE_AD_TENANT}.b2clogin.com/${process.env.AZURE_AD_TENANT}.onmicrosoft.com/discovery/v2.0/keys?p=${process.env.AZURE_AD_POLICY}`
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export async function validateToken(req: NextApiRequest) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new Error('No token provided');
  }
  
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      audience: process.env.AZURE_AD_CLIENT_ID,
      issuer: `https://${process.env.AZURE_AD_TENANT}.b2clogin.com/${process.env.AZURE_AD_TENANT_ID}/v2.0/`,
    }, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
}

// Use in API routes
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await validateToken(req);
    // Proceed with authenticated request
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
```

---

#### Solution 2: API Key (Simpler, Less Secure)

For development or internal use:

```typescript
// PowerApps passes API key in header
// X-API-Key: your-secret-key

// Validate in API
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  // Process request
}
```

**PowerApps Custom Connector Configuration:**
- Add custom header: `X-API-Key`
- Value: Your API key

**Pros:**
- Simple
- Fast setup

**Cons:**
- Less secure (key can be extracted)
- No user-level permissions
- Not recommended for production

---

#### Solution 3: Supabase Auth (Web App Only)

For the web app, use Supabase's built-in authentication:

```typescript
// Web app
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Get session token
const session = supabase.auth.session();

// Use token in API calls
```

**PowerApps Integration:**
- PowerApps uses Azure AD token
- Vercel API validates Azure AD token
- API internally uses Supabase service role key
- Map Azure AD user to Supabase user

---

## Data Flow Example

### Scenario: User edits a cell in PowerApps

```
1. User edits cell in PowerApps
   ↓
2. PowerApps calls: 
   POST /api/reports/sections/{sectionId}/data
   Headers: Authorization: Bearer {azureADToken}
   Body: { rowNumber: 5, columnName: "amount", value: "1500" }
   ↓
3. Vercel API validates Azure AD token
   ↓
4. API calls Supabase function:
   save_cell_value(sectionId, 5, "amount", "1500")
   ↓
5. Supabase updates report_cell_values table
   ↓
6. API returns success response
   ↓
7. PowerApps updates UI
```

### Scenario: User views report in Web App

```
1. User opens report in web app
   ↓
2. Web app calls:
   GET /api/reports/slices/{sliceId}/sections/{sectionId}/data
   Headers: Authorization: Bearer {azureADToken}
   ↓
3. Vercel API validates Azure AD token
   ↓
4. API calls Supabase function:
   get_report_section_data(sectionId)
   ↓
5. Supabase returns formatted data
   ↓
6. API returns data to web app
   ↓
7. Web app renders in AG Grid
```

---

## PowerApps to Web App Migration Path

### Phase 1: Parallel Operation
- Both PowerApps and Web App access same API
- Users can use either interface
- Gradual rollout

### Phase 2: Feature Parity
- Ensure web app has all features from PowerApps
- Train users on web app
- Gather feedback

### Phase 3: Deprecation (Optional)
- Move all users to web app
- Keep PowerApps as read-only for reports
- Or completely deprecate PowerApps

---

## API Implementation Example

### Complete Next.js API Structure

```
pages/api/
├── auth/
│   ├── login.ts
│   └── validate.ts
├── reports/
│   ├── slices/
│   │   ├── index.ts              // GET /api/reports/slices
│   │   └── [sliceId]/
│   │       ├── index.ts          // GET /api/reports/slices/{id}
│   │       ├── sections/
│   │       │   ├── index.ts      // GET sections
│   │       │   └── [sectionId]/
│   │       │       ├── data.ts   // GET/POST section data
│   │       │       └── structure.ts // GET column structure
│   ├── designs/
│   │   └── index.ts              // GET report designs
│   └── projects/
│       └── index.ts              // GET projects
├── lookups/
│   └── [entity].ts               // GET lookup values
├── images/
│   ├── upload.ts                 // POST upload image
│   └── [imageId].ts              // GET image
└── metadata.ts                   // API documentation
```

### Example: Get Sections API

```typescript
// pages/api/reports/slices/[sliceId]/sections/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { validateToken } from '@/middleware/auth';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Validate authentication
  try {
    await validateToken(req);
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { sliceId } = req.query;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('report_sections')
        .select(`
          id,
          name,
          order_number,
          is_active,
          enable_grouping,
          created_at,
          updated_at
        `)
        .eq('report_slice_id', sliceId)
        .order('order_number');

      if (error) throw error;

      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
```

---

## Testing PowerApps Integration

### Step 1: Test API with Postman
```
GET https://your-app.vercel.app/api/reports/slices
Headers:
  Authorization: Bearer {test-token}
  
Expected: 200 OK with list of slices
```

### Step 2: Test in PowerApps
```powerFx
// Create button with OnSelect:
Set(
    testResponse,
    KazinexReportsAPI.getReportSlices()
);

// Display in Label:
Label1.Text = JSON(testResponse, JSONFormat.IndentFour)
```

### Step 3: End-to-End Test
1. Create/edit data in PowerApps
2. Verify in Supabase database
3. View same data in web app
4. Edit in web app
5. Verify in PowerApps

---

## Performance Considerations

### Caching Strategy

```typescript
// Implement caching for frequently accessed data
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export async function getCachedData(key: string, fetcher: () => Promise<any>) {
  // Check cache
  const cached = await redis.get(key);
  if (cached) {
    return cached;
  }

  // Fetch and cache
  const data = await fetcher();
  await redis.set(key, JSON.stringify(data), { ex: 300 }); // 5 min TTL
  return data;
}

// Usage in API
const sections = await getCachedData(
  `sections:${sliceId}`,
  () => supabase.from('report_sections').select('*').eq('report_slice_id', sliceId)
);
```

---

## Monitoring & Logging

### Log API Calls

```typescript
// middleware/logger.ts
export async function logAPICall(
  req: NextApiRequest,
  res: NextApiResponse,
  duration: number,
  error?: any
) {
  const log = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration,
    error: error?.message,
    userId: req.user?.id,
    source: req.headers['user-agent']?.includes('PowerApps') ? 'PowerApps' : 'WebApp',
  };

  // Log to your logging service (e.g., Vercel Logs, Datadog, etc.)
  console.log(JSON.stringify(log));
  
  // Or send to external service
  // await logService.log(log);
}
```

---

## Cost Estimation

### API Costs (Vercel)
- Free tier: 100GB bandwidth/month
- Pro: $20/month, 1TB bandwidth
- Each API call ~5KB response
- 200,000 API calls ≈ 1GB

**Estimate:**
- 100 users × 100 API calls/day = 10,000 calls/day
- 10,000 × 5KB = 50MB/day = 1.5GB/month
- **Cost: FREE tier sufficient** or Pro ($20/month)

### Database Costs (Supabase)
- Free tier: 500MB database, 1GB file storage
- Pro: $25/month, 8GB database, 100GB storage

**Estimate:**
- Depends on data volume
- Images stored in Supabase Storage
- **Cost: $0-25/month**

---

## Summary & Recommendations

### ✅ Recommended Architecture

```
                    ┌─────────────────┐
                    │   Azure AD B2C   │
                    │  (Authentication)│
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
     ┌────────▼────────┐         ┌─────────▼──────┐
     │   PowerApps     │         │    Web App     │
     │  (Canvas App)   │         │  (Next.js +    │
     │                 │         │   AG Grid)     │
     └────────┬────────┘         └────────┬───────┘
              │                           │
              └──────────┬────────────────┘
                         │
                ┌────────▼─────────┐
                │   Vercel API     │
                │  (Next.js API)   │
                │  - REST endpoints│
                │  - Auth validate │
                │  - Business logic│
                └────────┬─────────┘
                         │
                ┌────────▼─────────┐
                │    Supabase      │
                │   - PostgreSQL   │
                │   - Storage      │
                │   - RLS policies │
                └──────────────────┘
```

### Key Benefits
1. ✅ Single source of truth (Supabase)
2. ✅ Unified API for both clients
3. ✅ Secure authentication
4. ✅ Scalable architecture
5. ✅ Gradual migration path

---

*Next Document: 05-Implementation-Roadmap.md*
