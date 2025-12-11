# Database Schema - PostgreSQL (Supabase)

**Date:** December 11, 2025  
**Database:** PostgreSQL 15 (Supabase)  
**Migration From:** Dataverse EAV model

---

## Schema Philosophy

**Keep the EAV model** - It's actually a good design for your use case:
- ✅ Dynamic columns per section
- ✅ Flexible schema
- ✅ Efficient storage
- ✅ Easy to query with PostgreSQL's JSON capabilities

**Improvements from Dataverse:**
- Better indexing
- Materialized views for performance
- PostgreSQL-specific optimizations
- Cleaner naming (no prefixes)

---

## Complete Database Schema

### 1. Authentication & Users (Supabase Auth)

```sql
-- Managed by Supabase Auth
-- auth.users table

-- Extended user profile
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
```

---

### 2. Projects

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_active ON projects(is_active);
CREATE INDEX idx_projects_code ON projects(code);

-- Project members
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
```

---

### 3. Report Designs (Templates)

```sql
CREATE TABLE report_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_designs_active ON report_designs(is_active);
```

---

### 4. Report Sections (Tab Templates)

```sql
CREATE TABLE report_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_design_id UUID NOT NULL REFERENCES report_designs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  enable_grouping BOOLEAN DEFAULT true, -- true = multi-row, false = single-row
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(report_design_id, sort_order)
);

CREATE INDEX idx_report_sections_design ON report_sections(report_design_id);
CREATE INDEX idx_report_sections_order ON report_sections(report_design_id, sort_order);
```

---

### 5. Report Structures (Column Definitions)

```sql
CREATE TYPE column_type AS ENUM (
  'text', 
  'number', 
  'percent', 
  'date', 
  'lookup', 
  'image', 
  'calculated'
);

CREATE TYPE column_size AS ENUM (
  'xsmall',  -- 80px
  'small',   -- 120px
  'medium',  -- 180px
  'large',   -- 240px
  'xlarge'   -- 300px
);

CREATE TABLE report_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_section_id UUID NOT NULL REFERENCES report_sections(id) ON DELETE CASCADE,
  
  -- Column identity
  field_name TEXT NOT NULL,           -- Internal identifier (e.g., "account_name")
  display_name TEXT NOT NULL,         -- Display in UI (e.g., "Account Name")
  
  -- Column type
  data_type column_type NOT NULL DEFAULT 'text',
  
  -- Properties
  sort_order INTEGER NOT NULL,
  column_size column_size DEFAULT 'medium',
  is_editable BOOLEAN DEFAULT true,
  is_calculated BOOLEAN DEFAULT false,
  
  -- For calculated columns
  calculation_formula TEXT,           -- Formula for calculated fields
  calculation_group TEXT,             -- Group identifier for calculations
  
  -- For lookup columns
  lookup_entity TEXT,                 -- Which lookup table to use
  lookup_display_field TEXT,          -- Which field to display
  
  -- Validation
  validation_rules JSONB,             -- JSON validation rules
  default_value TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(report_section_id, field_name)
);

CREATE INDEX idx_report_structures_section ON report_structures(report_section_id);
CREATE INDEX idx_report_structures_order ON report_structures(report_section_id, sort_order);
CREATE INDEX idx_report_structures_lookup ON report_structures(lookup_entity) WHERE data_type = 'lookup';
```

---

### 6. Report Structure Lookups (Dropdown Options)

```sql
CREATE TABLE report_structure_lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_structure_id UUID NOT NULL REFERENCES report_structures(id) ON DELETE CASCADE,
  
  -- Lookup value
  lookup_key TEXT NOT NULL,           -- The value stored
  lookup_label TEXT NOT NULL,         -- The text displayed
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(report_structure_id, lookup_key)
);

CREATE INDEX idx_structure_lookups_structure ON report_structure_lookups(report_structure_id);
CREATE INDEX idx_structure_lookups_order ON report_structure_lookups(report_structure_id, sort_order);
```

---

### 7. Report Slices (Actual Reports)

```sql
CREATE TABLE report_slices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  ref_no TEXT UNIQUE,                 -- User-friendly reference number (e.g., "RPT-2025-001")
  name TEXT,                          -- Optional custom name
  data_date DATE,                     -- Report period date
  
  -- Relationships
  report_design_id UUID NOT NULL REFERENCES report_designs(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_slices_design ON report_slices(report_design_id);
CREATE INDEX idx_report_slices_project ON report_slices(project_id);
CREATE INDEX idx_report_slices_date ON report_slices(data_date DESC);
CREATE INDEX idx_report_slices_ref ON report_slices(ref_no);
```

---

### 8. Report Data (EAV - Cell Values)

**This is the core table storing all cell values.**

```sql
CREATE TABLE report_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What and where
  report_slice_id UUID NOT NULL REFERENCES report_slices(id) ON DELETE CASCADE,
  report_section_id UUID NOT NULL REFERENCES report_sections(id) ON DELETE CASCADE,
  report_structure_id UUID NOT NULL REFERENCES report_structures(id) ON DELETE CASCADE,
  
  -- Row identification
  row_number INTEGER NOT NULL,        -- Row number (1, 2, 3...)
  row_group TEXT NOT NULL,            -- Row identifier (UUID or string)
  
  -- The actual value (stored as TEXT for flexibility)
  data_value TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Composite unique constraint
  UNIQUE(report_slice_id, report_section_id, report_structure_id, row_number)
);

-- Critical indexes for performance
CREATE INDEX idx_report_data_slice_section ON report_data(report_slice_id, report_section_id);
CREATE INDEX idx_report_data_row ON report_data(report_slice_id, report_section_id, row_number);
CREATE INDEX idx_report_data_structure ON report_data(report_structure_id);
```

**Example Data:**

| id | report_slice_id | report_section_id | report_structure_id | row_number | row_group | data_value |
|----|----------------|-------------------|---------------------|------------|-----------|------------|
| 001 | slice-A | section-1 | struct-name | 1 | row-001 | "Cash" |
| 002 | slice-A | section-1 | struct-amount | 1 | row-001 | "50000" |
| 003 | slice-A | section-1 | struct-percent | 1 | row-001 | "5.2" |
| 004 | slice-A | section-1 | struct-name | 2 | row-002 | "Inventory" |
| 005 | slice-A | section-1 | struct-amount | 2 | row-002 | "125000" |

---

## PostgreSQL Functions

### Function: Get Report Data (Pivoted)

```sql
CREATE OR REPLACE FUNCTION get_report_section_data(
  p_slice_id UUID,
  p_section_id UUID
)
RETURNS TABLE (
  row_id TEXT,
  row_number INTEGER,
  data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rd.row_group AS row_id,
    rd.row_number,
    jsonb_object_agg(
      rs.field_name,
      CASE rs.data_type
        WHEN 'number' THEN to_jsonb(NULLIF(rd.data_value, '')::NUMERIC)
        WHEN 'percent' THEN to_jsonb(NULLIF(rd.data_value, '')::NUMERIC)
        WHEN 'date' THEN to_jsonb(NULLIF(rd.data_value, '')::DATE)
        ELSE to_jsonb(rd.data_value)
      END
    ) AS data
  FROM report_data rd
  INNER JOIN report_structures rs ON rd.report_structure_id = rs.id
  WHERE rd.report_slice_id = p_slice_id
    AND rd.report_section_id = p_section_id
  GROUP BY rd.row_group, rd.row_number
  ORDER BY rd.row_number;
END;
$$ LANGUAGE plpgsql;
```

**Usage:**
```sql
SELECT * FROM get_report_section_data(
  'slice-uuid',
  'section-uuid'
);

-- Returns:
-- row_id | row_number | data
-- row-001 | 1 | {"account_name": "Cash", "amount": 50000, "percent": 5.2}
-- row-002 | 2 | {"account_name": "Inventory", "amount": 125000}
```

---

### Function: Save Cell Value

```sql
CREATE OR REPLACE FUNCTION upsert_cell_value(
  p_slice_id UUID,
  p_section_id UUID,
  p_structure_id UUID,
  p_row_number INTEGER,
  p_row_group TEXT,
  p_data_value TEXT
)
RETURNS UUID AS $$
DECLARE
  v_record_id UUID;
BEGIN
  INSERT INTO report_data (
    report_slice_id,
    report_section_id,
    report_structure_id,
    row_number,
    row_group,
    data_value
  )
  VALUES (
    p_slice_id,
    p_section_id,
    p_structure_id,
    p_row_number,
    p_row_group,
    p_data_value
  )
  ON CONFLICT (report_slice_id, report_section_id, report_structure_id, row_number)
  DO UPDATE SET
    data_value = EXCLUDED.data_value,
    updated_at = NOW()
  RETURNING id INTO v_record_id;
  
  RETURN v_record_id;
END;
$$ LANGUAGE plpgsql;
```

---

### Function: Copy From Previous Slice

```sql
CREATE OR REPLACE FUNCTION copy_from_previous_slice(
  p_source_slice_id UUID,
  p_target_slice_id UUID,
  p_section_ids UUID[]
)
RETURNS INTEGER AS $$
DECLARE
  v_copied_count INTEGER := 0;
BEGIN
  INSERT INTO report_data (
    report_slice_id,
    report_section_id,
    report_structure_id,
    row_number,
    row_group,
    data_value
  )
  SELECT
    p_target_slice_id,
    report_section_id,
    report_structure_id,
    row_number,
    row_group,
    data_value
  FROM report_data
  WHERE report_slice_id = p_source_slice_id
    AND report_section_id = ANY(p_section_ids);
  
  GET DIAGNOSTICS v_copied_count = ROW_COUNT;
  
  RETURN v_copied_count;
END;
$$ LANGUAGE plpgsql;
```

---

## Materialized Views (Performance)

### View: Report Summary

```sql
CREATE MATERIALIZED VIEW mv_report_summary AS
SELECT
  rs.id AS slice_id,
  rs.ref_no,
  rs.data_date,
  rd.name AS design_name,
  p.name AS project_name,
  COUNT(DISTINCT sec.id) AS section_count,
  COUNT(DISTINCT rdata.row_number) AS total_rows,
  rs.created_at,
  rs.updated_at
FROM report_slices rs
LEFT JOIN report_designs rd ON rs.report_design_id = rd.id
LEFT JOIN projects p ON rs.project_id = p.id
LEFT JOIN report_sections sec ON sec.report_design_id = rs.report_design_id
LEFT JOIN report_data rdata ON rdata.report_slice_id = rs.id
GROUP BY rs.id, rs.ref_no, rs.data_date, rd.name, p.name, rs.created_at, rs.updated_at;

-- Index for fast queries
CREATE UNIQUE INDEX idx_mv_report_summary_slice ON mv_report_summary(slice_id);
CREATE INDEX idx_mv_report_summary_project ON mv_report_summary(project_name);

-- Auto-refresh trigger
CREATE OR REPLACE FUNCTION refresh_report_summary()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_report_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_summary_on_slice
AFTER INSERT OR UPDATE OR DELETE ON report_slices
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_report_summary();
```

---

## Row-Level Security (RLS)

### Enable RLS on All Tables

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_slices ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_data ENABLE ROW LEVEL SECURITY;
```

### Policies

#### Projects
```sql
-- Users can view projects they're members of
CREATE POLICY "Users can view their projects"
  ON projects FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = projects.id
    )
    OR
    is_active = true -- Public projects (optional)
  );

-- Admins can do anything
CREATE POLICY "Admins can manage all projects"
  ON projects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

#### Report Slices
```sql
-- Users can view slices in their projects
CREATE POLICY "Users can view project slices"
  ON report_slices FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- Users can edit slices in projects where they're editors
CREATE POLICY "Editors can modify project slices"
  ON report_slices FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
    )
  );
```

#### Report Data
```sql
-- Users can view data from their project slices
CREATE POLICY "Users can view their project data"
  ON report_data FOR SELECT
  USING (
    report_slice_id IN (
      SELECT id FROM report_slices
      WHERE project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

-- Editors can modify data
CREATE POLICY "Editors can modify project data"
  ON report_data FOR ALL
  USING (
    report_slice_id IN (
      SELECT id FROM report_slices
      WHERE project_id IN (
        SELECT project_id FROM project_members 
        WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
      )
    )
  );
```

#### Admin Tables (Designs, Sections, Structures)
```sql
-- Only admins can manage designs
CREATE POLICY "Admins can manage designs"
  ON report_designs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Everyone can view active designs
CREATE POLICY "Users can view active designs"
  ON report_designs FOR SELECT
  USING (is_active = true);

-- Similar policies for sections and structures
-- (Only admins can manage, everyone can view)
```

---

## Storage Buckets (Supabase Storage)

### Create Bucket for Images

```sql
-- Via Supabase Dashboard or SQL
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-images', 'report-images', true);
```

### Storage Policies

```sql
-- Users can upload images for their projects
CREATE POLICY "Users can upload project images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'report-images'
  AND
  -- Check if user has access to the report/project
  -- Path format: {project_id}/{slice_id}/{filename}
  (storage.foldername(name))[1]::UUID IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);

-- Users can view images from their projects
CREATE POLICY "Users can view project images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'report-images'
  AND
  (storage.foldername(name))[1]::UUID IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);
```

---

## Database Migration Script

### Initial Setup Script

```sql
-- Run this after creating Supabase project

-- 1. Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create types
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');
CREATE TYPE column_type AS ENUM ('text', 'number', 'percent', 'date', 'lookup', 'image', 'calculated');
CREATE TYPE column_size AS ENUM ('xsmall', 'small', 'medium', 'large', 'xlarge');

-- 3. Create tables (in order of dependencies)
-- user_profiles
-- user_roles
-- projects
-- project_members
-- report_designs
-- report_sections
-- report_structures
-- report_structure_lookups
-- report_slices
-- report_data

-- 4. Create indexes
-- (See above)

-- 5. Create functions
-- (See above)

-- 6. Create materialized views
-- (See above)

-- 7. Enable RLS
-- (See above)

-- 8. Create policies
-- (See above)

-- 9. Create storage bucket and policies
-- (See above)
```

---

## Testing the Schema

### Insert Test Data

```sql
-- 1. Create admin user role
INSERT INTO user_roles (user_id, role)
VALUES (auth.uid(), 'admin');

-- 2. Create project
INSERT INTO projects (name, code, description)
VALUES ('Test Project', 'TEST-001', 'Test project for demo')
RETURNING id;

-- 3. Create report design
INSERT INTO report_designs (name, description)
VALUES ('Financial Report', 'Monthly financial report template')
RETURNING id;

-- 4. Create section
INSERT INTO report_sections (report_design_id, name, sort_order, enable_grouping)
VALUES (
  '<design-id>',
  'Income Statement',
  1,
  true
)
RETURNING id;

-- 5. Create structures (columns)
INSERT INTO report_structures (
  report_section_id,
  field_name,
  display_name,
  data_type,
  sort_order,
  column_size
) VALUES
  ('<section-id>', 'account_name', 'Account Name', 'text', 1, 'large'),
  ('<section-id>', 'amount', 'Amount', 'number', 2, 'medium'),
  ('<section-id>', 'percent', 'Percent', 'percent', 3, 'small');

-- 6. Create report slice
INSERT INTO report_slices (
  ref_no,
  data_date,
  report_design_id,
  project_id
) VALUES (
  'RPT-2025-001',
  '2025-01-31',
  '<design-id>',
  '<project-id>'
)
RETURNING id;

-- 7. Insert data
INSERT INTO report_data (
  report_slice_id,
  report_section_id,
  report_structure_id,
  row_number,
  row_group,
  data_value
) VALUES
  ('<slice-id>', '<section-id>', '<struct-name-id>', 1, 'row-001', 'Cash'),
  ('<slice-id>', '<section-id>', '<struct-amount-id>', 1, 'row-001', '50000'),
  ('<slice-id>', '<section-id>', '<struct-percent-id>', 1, 'row-001', '5.2');

-- 8. Query data (pivoted)
SELECT * FROM get_report_section_data('<slice-id>', '<section-id>');
```

---

## Next Steps

1. ✅ Review schema design
2. 🏗️ Create Supabase project
3. 📝 Run migration script
4. ✅ Test with sample data
5. 📊 Move to [03-Admin-UI-Specification.md](03-Admin-UI-Specification.md)

---

*Next: Admin UI for managing report designs*
