# Database Migration Strategy - Dataverse to Supabase

**Date:** December 11, 2025  
**Source:** Microsoft Dataverse  
**Target:** Supabase (PostgreSQL)

---

## Current Dataverse Schema Analysis

### Entity: `reportslice` (Main Report Container)
```typescript
Fields:
- kazinex_reportsliceid (GUID, PK)
- kazinex_name (String)
- kazinex_description (String, Optional)
- createdon (DateTime)
- modifiedon (DateTime)

Relationships:
- One-to-Many → reportsection
- Many-to-One → reportdesign (via kazinex_reportdesign lookup)
- Many-to-One → project (via kazinex_project lookup)
```

### Entity: `reportsection` (Report Tabs)
```typescript
Fields:
- kazinex_reportsectionid (GUID, PK)
- kazinex_name (String)
- kazinex_reportsliceid (GUID, FK)
- kazinex_ordernumber (Integer)
- kazinex_isactive (Boolean)
- kazinex_grouping (Boolean, Optional)
- kazinex_reportdesignsectionid (GUID, FK to design)

Relationships:
- Many-to-One → reportslice
- One-to-Many → reportdata
- Many-to-One → reportdesignsection
```

### Entity: `reportstructure` (Column Definitions)
```typescript
Fields:
- kazinex_reportstructureid (GUID, PK)
- kazinex_reportsectionid (GUID, FK)
- kazinex_columnname (String)
- kazinex_columndisplayname (String)
- kazinex_columntype (OptionSet: text|number|percent|lookup|date|image)
- kazinex_datatype (String, Alternative field)
- kazinex_fieldname (String)
- kazinex_iscalculated (Boolean)
- kazinex_ordernumber (Integer)
- kazinex_iseditable (Boolean)
- kazinex_width (Integer, Optional)
- kazinex_columnsize (OptionSet: xsmall|small|medium|large|xlarge)

Relationships:
- Many-to-One → reportsection (via design)
```

### Entity: `reportdata` (Actual Data Rows)
```typescript
Fields:
- kazinex_reportdataid (GUID, PK)
- kazinex_reportsectionid (GUID, FK)
- kazinex_ordernumber (Integer)
- [Dynamic columns based on reportstructure]
  - kazinex_text1, kazinex_text2, ..., kazinex_text20
  - kazinex_number1, kazinex_number2, ..., kazinex_number20
  - kazinex_percent1, kazinex_percent2, ..., kazinex_percent10
  - kazinex_date1, kazinex_date2, ..., kazinex_date10
  - kazinex_lookup1, kazinex_lookup2, ..., kazinex_lookup10
  - kazinex_image1, kazinex_image2, ..., kazinex_image10
- createdon (DateTime)
- modifiedon (DateTime)
```

---

## Supabase PostgreSQL Schema Design

### Approach: Enhanced Relational Model

Instead of Dataverse's "wide table" approach (reportdata with 20 text fields, 20 number fields, etc.), we'll use a more normalized PostgreSQL approach:

### Option 1: Dynamic Columns (Similar to current)

**Pros:**
- Direct migration path
- Familiar structure
- Simple queries

**Cons:**
- Less flexible
- Column limit issues if you need more fields
- Harder to query dynamically

### Option 2: EAV (Entity-Attribute-Value) ⭐ RECOMMENDED

**Pros:**
- Unlimited columns
- Highly flexible
- Easy to add new column types
- Better for dynamic schemas

**Cons:**
- Slightly more complex queries
- Need to handle data types carefully

---

## Recommended Schema

### Table: `report_slices`
```sql
CREATE TABLE report_slices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  report_design_id UUID REFERENCES report_designs(id),
  project_id UUID REFERENCES projects(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Add indexes for common queries
  INDEX idx_report_slices_design (report_design_id),
  INDEX idx_report_slices_project (project_id),
  INDEX idx_report_slices_updated (updated_at DESC)
);

-- Enable Row Level Security
ALTER TABLE report_slices ENABLE ROW LEVEL SECURITY;

-- RLS Policy example (adjust based on your auth requirements)
CREATE POLICY "Users can view their organization's reports"
  ON report_slices FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM user_projects 
      WHERE user_id = auth.uid()
    )
  );
```

### Table: `report_sections`
```sql
CREATE TABLE report_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  report_slice_id UUID NOT NULL REFERENCES report_slices(id) ON DELETE CASCADE,
  report_design_section_id UUID REFERENCES report_design_sections(id),
  order_number INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  enable_grouping BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_report_sections_slice (report_slice_id),
  INDEX idx_report_sections_order (report_slice_id, order_number),
  
  UNIQUE (report_slice_id, order_number)
);

ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sections of their reports"
  ON report_sections FOR SELECT
  USING (
    report_slice_id IN (
      SELECT id FROM report_slices
    )
  );
```

### Table: `report_columns` (Structure Definition)
```sql
CREATE TYPE column_type AS ENUM (
  'text', 'number', 'percent', 'lookup', 'date', 'image', 'formula'
);

CREATE TYPE column_size AS ENUM (
  'xsmall', 'small', 'medium', 'large', 'xlarge'
);

CREATE TABLE report_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_design_section_id UUID NOT NULL REFERENCES report_design_sections(id),
  column_name TEXT NOT NULL, -- Internal identifier
  display_name TEXT NOT NULL, -- Display in UI
  column_type column_type NOT NULL,
  field_name TEXT, -- For lookup/reference fields
  is_calculated BOOLEAN DEFAULT false,
  is_editable BOOLEAN DEFAULT true,
  order_number INTEGER NOT NULL,
  column_size column_size DEFAULT 'medium',
  width_pixels INTEGER,
  lookup_entity TEXT, -- For lookup columns
  lookup_display_field TEXT, -- Which field to display from lookup
  validation_rules JSONB, -- Store validation rules as JSON
  default_value TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_report_columns_design (report_design_section_id),
  INDEX idx_report_columns_order (report_design_section_id, order_number),
  
  UNIQUE (report_design_section_id, column_name)
);
```

### Table: `report_data` (Actual Data - EAV Model)
```sql
CREATE TABLE report_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_section_id UUID NOT NULL REFERENCES report_sections(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  INDEX idx_report_data_section (report_section_id),
  INDEX idx_report_data_row (report_section_id, row_number),
  
  UNIQUE (report_section_id, row_number)
);

ALTER TABLE report_data ENABLE ROW LEVEL SECURITY;
```

### Table: `report_cell_values` (Cell Data)
```sql
CREATE TABLE report_cell_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_data_id UUID NOT NULL REFERENCES report_data(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES report_columns(id) ON DELETE CASCADE,
  
  -- Store values in appropriate typed columns
  text_value TEXT,
  number_value DECIMAL(18, 2),
  percent_value DECIMAL(5, 2),
  date_value DATE,
  lookup_value UUID, -- Reference to another record
  image_url TEXT, -- URL to Supabase Storage
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_cell_values_data (report_data_id),
  INDEX idx_cell_values_column (column_id),
  INDEX idx_cell_values_lookup (lookup_value),
  
  UNIQUE (report_data_id, column_id),
  
  -- Constraint: Only one value column should be non-null
  CHECK (
    (text_value IS NOT NULL)::integer +
    (number_value IS NOT NULL)::integer +
    (percent_value IS NOT NULL)::integer +
    (date_value IS NOT NULL)::integer +
    (lookup_value IS NOT NULL)::integer +
    (image_url IS NOT NULL)::integer = 1
  )
);

ALTER TABLE report_cell_values ENABLE ROW LEVEL SECURITY;
```

---

## Optimized Query View

For easier querying, create a view that pivots the EAV structure:

```sql
CREATE OR REPLACE VIEW report_data_flat AS
SELECT
  rd.id AS row_id,
  rd.report_section_id,
  rd.row_number,
  jsonb_object_agg(
    rc.column_name,
    COALESCE(
      rcv.text_value,
      rcv.number_value::text,
      rcv.percent_value::text,
      rcv.date_value::text,
      rcv.lookup_value::text,
      rcv.image_url
    )
  ) AS data,
  rd.created_at,
  rd.updated_at
FROM report_data rd
LEFT JOIN report_cell_values rcv ON rd.id = rcv.report_data_id
LEFT JOIN report_columns rc ON rcv.column_id = rc.id
GROUP BY rd.id, rd.report_section_id, rd.row_number, rd.created_at, rd.updated_at;
```

---

## Supporting Tables

### Table: `report_designs`
```sql
CREATE TABLE report_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `report_design_sections`
```sql
CREATE TABLE report_design_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_design_id UUID NOT NULL REFERENCES report_designs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_number INTEGER NOT NULL,
  enable_grouping BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_design_sections_design (report_design_id),
  UNIQUE (report_design_id, order_number)
);
```

### Table: `projects`
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `lookup_entities` (For dynamic lookups)
```sql
CREATE TABLE lookup_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  primary_field TEXT NOT NULL, -- Field to display in dropdown
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example lookup tables
CREATE TABLE lookup_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  account_number TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE lookup_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES lookup_categories(id),
  is_active BOOLEAN DEFAULT true
);
```

---

## Image Storage Strategy

### Using Supabase Storage

```sql
-- Images are stored in Supabase Storage buckets
-- Cell values just store the public URL

-- Create storage bucket via Supabase Dashboard or API
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-images', 'report-images', true);

-- Storage policy for authenticated users
CREATE POLICY "Users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'report-images');

CREATE POLICY "Users can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'report-images');
```

---

## Migration Functions

### Function: Get Report Data (for API)
```sql
CREATE OR REPLACE FUNCTION get_report_section_data(
  p_section_id UUID
)
RETURNS TABLE (
  row_id UUID,
  row_number INTEGER,
  data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rd.id,
    rd.row_number,
    jsonb_object_agg(
      rc.column_name,
      CASE rc.column_type
        WHEN 'number' THEN to_jsonb(rcv.number_value)
        WHEN 'percent' THEN to_jsonb(rcv.percent_value)
        WHEN 'date' THEN to_jsonb(rcv.date_value)
        WHEN 'lookup' THEN to_jsonb(rcv.lookup_value)
        WHEN 'image' THEN to_jsonb(rcv.image_url)
        ELSE to_jsonb(rcv.text_value)
      END
    ) AS data,
    rd.created_at,
    rd.updated_at
  FROM report_data rd
  LEFT JOIN report_cell_values rcv ON rd.id = rcv.report_data_id
  LEFT JOIN report_columns rc ON rcv.column_id = rc.id
  WHERE rd.report_section_id = p_section_id
  GROUP BY rd.id, rd.row_number, rd.created_at, rd.updated_at
  ORDER BY rd.row_number;
END;
$$ LANGUAGE plpgsql;
```

### Function: Save Cell Value (Upsert)
```sql
CREATE OR REPLACE FUNCTION save_cell_value(
  p_section_id UUID,
  p_row_number INTEGER,
  p_column_name TEXT,
  p_value TEXT
)
RETURNS UUID AS $$
DECLARE
  v_row_id UUID;
  v_column_id UUID;
  v_column_type TEXT;
BEGIN
  -- Get or create row
  INSERT INTO report_data (report_section_id, row_number)
  VALUES (p_section_id, p_row_number)
  ON CONFLICT (report_section_id, row_number) DO UPDATE
    SET updated_at = NOW()
  RETURNING id INTO v_row_id;
  
  -- Get column info
  SELECT id, column_type INTO v_column_id, v_column_type
  FROM report_columns rc
  JOIN report_design_sections rds ON rc.report_design_section_id = rds.id
  JOIN report_sections rs ON rs.report_design_section_id = rds.id
  WHERE rs.id = p_section_id AND rc.column_name = p_column_name;
  
  -- Upsert cell value based on column type
  INSERT INTO report_cell_values (
    report_data_id,
    column_id,
    text_value,
    number_value,
    percent_value,
    date_value
  )
  VALUES (
    v_row_id,
    v_column_id,
    CASE WHEN v_column_type = 'text' THEN p_value END,
    CASE WHEN v_column_type = 'number' THEN p_value::DECIMAL END,
    CASE WHEN v_column_type = 'percent' THEN p_value::DECIMAL END,
    CASE WHEN v_column_type = 'date' THEN p_value::DATE END
  )
  ON CONFLICT (report_data_id, column_id) DO UPDATE
    SET text_value = EXCLUDED.text_value,
        number_value = EXCLUDED.number_value,
        percent_value = EXCLUDED.percent_value,
        date_value = EXCLUDED.date_value,
        updated_at = NOW();
  
  RETURN v_row_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Data Migration Strategy

### Step 1: Export from Dataverse

```typescript
// Use Dataverse WebAPI to export data
// Can be done via Power Automate or custom script

// Export script example
async function exportFromDataverse() {
  const entities = [
    'reportslice',
    'reportsection', 
    'reportstructure',
    'reportdata'
  ];
  
  for (const entity of entities) {
    const data = await fetchAllRecords(entity);
    await fs.writeFile(`export_${entity}.json`, JSON.stringify(data));
  }
}
```

### Step 2: Transform Data

```typescript
// Transform script to convert Dataverse format to Supabase format
async function transformData() {
  // Read exported data
  const slices = JSON.parse(await fs.readFile('export_reportslice.json'));
  const sections = JSON.parse(await fs.readFile('export_reportsection.json'));
  const structures = JSON.parse(await fs.readFile('export_reportstructure.json'));
  const data = JSON.parse(await fs.readFile('export_reportdata.json'));
  
  // Transform reportdata from wide format to EAV
  const cellValues = [];
  
  for (const row of data) {
    for (let i = 1; i <= 20; i++) {
      // Text columns
      if (row[`kazinex_text${i}`]) {
        cellValues.push({
          report_data_id: row.kazinex_reportdataid,
          column_name: getColumnNameForField(`text${i}`, structures),
          text_value: row[`kazinex_text${i}`]
        });
      }
      
      // Number columns
      if (row[`kazinex_number${i}`] !== null) {
        cellValues.push({
          report_data_id: row.kazinex_reportdataid,
          column_name: getColumnNameForField(`number${i}`, structures),
          number_value: row[`kazinex_number${i}`]
        });
      }
      
      // ... repeat for other types
    }
  }
  
  await fs.writeFile('transformed_cell_values.json', JSON.stringify(cellValues));
}
```

### Step 3: Import to Supabase

```typescript
// Use Supabase client to import
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function importToSupabase() {
  // Import in order due to foreign keys
  await importSlices();
  await importSections();
  await importColumns();
  await importData();
  await importCellValues();
}

async function importSlices() {
  const slices = JSON.parse(await fs.readFile('transformed_slices.json'));
  
  const { error } = await supabase
    .from('report_slices')
    .insert(slices);
    
  if (error) throw error;
}
```

---

## Performance Optimization

### Indexes
Already included in schema above. Key indexes:
- Foreign keys (automatic in PostgreSQL)
- report_section_id + row_number (common filter)
- created_at, updated_at (sorting)
- lookup_value (for joins)

### Materialized Views
For heavy reporting queries:

```sql
CREATE MATERIALIZED VIEW mv_report_summary AS
SELECT
  rs.id AS section_id,
  rs.name AS section_name,
  COUNT(DISTINCT rd.id) AS row_count,
  rs.updated_at AS last_updated
FROM report_sections rs
LEFT JOIN report_data rd ON rs.id = rd.report_section_id
GROUP BY rs.id, rs.name, rs.updated_at;

-- Refresh periodically
REFRESH MATERIALIZED VIEW mv_report_summary;

-- Or set up automatic refresh trigger
CREATE OR REPLACE FUNCTION refresh_report_summary()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_report_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_summary
AFTER INSERT OR UPDATE OR DELETE ON report_data
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_report_summary();
```

---

## API Layer (Next.js API Routes)

### Example: Get Report Data

```typescript
// pages/api/reports/[sliceId]/sections/[sectionId]/data.ts
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { sectionId } = req.query;
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  if (req.method === 'GET') {
    // Get data
    const { data, error } = await supabase
      .rpc('get_report_section_data', { p_section_id: sectionId });
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json(data);
  }
  
  if (req.method === 'POST') {
    // Save data
    const { rowNumber, columnName, value } = req.body;
    
    const { data, error } = await supabase
      .rpc('save_cell_value', {
        p_section_id: sectionId,
        p_row_number: rowNumber,
        p_column_name: columnName,
        p_value: value
      });
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json({ success: true, rowId: data });
  }
}
```

---

## Testing Strategy

### 1. Unit Tests (Schema)
```sql
-- Test data integrity
INSERT INTO report_data (report_section_id, row_number)
VALUES ('test-uuid', 1);

-- Should fail: duplicate row
INSERT INTO report_data (report_section_id, row_number)
VALUES ('test-uuid', 1);

-- Test cell value constraint
INSERT INTO report_cell_values (
  report_data_id, column_id, text_value, number_value
)
VALUES ('test-uuid', 'col-uuid', 'test', 123);
-- Should fail: multiple values set
```

### 2. Performance Tests
```sql
-- Test query performance with large dataset
EXPLAIN ANALYZE
SELECT * FROM get_report_section_data('section-uuid');

-- Should use indexes efficiently
```

---

## Backup & Recovery

```sql
-- Automated backups (Supabase Pro includes this)
-- Manual backup
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql

-- Restore
psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql
```

---

## Next Steps

1. ✅ Review schema design
2. 🗃️ Set up Supabase project
3. 🔨 Run schema creation scripts
4. 📤 Export sample data from Dataverse
5. 🔄 Test data transformation
6. 📥 Import to Supabase
7. ✅ Validate data integrity
8. 🚀 Build API layer

---

*Next Document: 04-PowerApps-Integration-API.md*
