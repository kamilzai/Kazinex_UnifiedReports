-- ============================================================================
-- Kazinex Unified Reports - Database Migration Script
-- ============================================================================
-- Run this in Supabase SQL Editor
-- This script creates all tables, types, functions, and policies
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');
CREATE TYPE column_type AS ENUM ('text', 'number', 'percent', 'date', 'lookup', 'image', 'calculated');
CREATE TYPE column_size AS ENUM ('xsmall', 'small', 'medium', 'large', 'xlarge');

-- ============================================================================
-- USER TABLES
-- ============================================================================

-- User profiles (extends auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);

-- ============================================================================
-- PROJECT TABLES
-- ============================================================================

-- Projects
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

-- ============================================================================
-- REPORT DESIGN TABLES (Templates)
-- ============================================================================

-- Report designs
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

-- Report sections (tabs within a design)
CREATE TABLE report_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_design_id UUID NOT NULL REFERENCES report_designs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  enable_grouping BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_design_id, sort_order)
);

CREATE INDEX idx_report_sections_design ON report_sections(report_design_id);
CREATE INDEX idx_report_sections_order ON report_sections(report_design_id, sort_order);

-- Report structures (column definitions)
CREATE TABLE report_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_section_id UUID NOT NULL REFERENCES report_sections(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  data_type column_type NOT NULL DEFAULT 'text',
  sort_order INTEGER NOT NULL,
  column_size column_size DEFAULT 'medium',
  is_editable BOOLEAN DEFAULT true,
  is_calculated BOOLEAN DEFAULT false,
  calculation_formula TEXT,
  calculation_group TEXT,
  lookup_entity TEXT,
  lookup_display_field TEXT,
  validation_rules JSONB,
  default_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_section_id, field_name)
);

CREATE INDEX idx_report_structures_section ON report_structures(report_section_id);
CREATE INDEX idx_report_structures_order ON report_structures(report_section_id, sort_order);
CREATE INDEX idx_report_structures_lookup ON report_structures(lookup_entity) WHERE data_type = 'lookup';

-- Report structure lookups (dropdown options)
CREATE TABLE report_structure_lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_structure_id UUID NOT NULL REFERENCES report_structures(id) ON DELETE CASCADE,
  lookup_key TEXT NOT NULL,
  lookup_label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_structure_id, lookup_key)
);

CREATE INDEX idx_structure_lookups_structure ON report_structure_lookups(report_structure_id);
CREATE INDEX idx_structure_lookups_order ON report_structure_lookups(report_structure_id, sort_order);

-- ============================================================================
-- REPORT INSTANCE TABLES (Actual Reports)
-- ============================================================================

-- Report slices (actual report instances)
CREATE TABLE report_slices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no TEXT UNIQUE,
  name TEXT,
  data_date DATE,
  report_design_id UUID NOT NULL REFERENCES report_designs(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_slices_design ON report_slices(report_design_id);
CREATE INDEX idx_report_slices_project ON report_slices(project_id);
CREATE INDEX idx_report_slices_date ON report_slices(data_date DESC);
CREATE INDEX idx_report_slices_ref ON report_slices(ref_no);

-- Report data (EAV model - one row per cell)
CREATE TABLE report_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_slice_id UUID NOT NULL REFERENCES report_slices(id) ON DELETE CASCADE,
  report_section_id UUID NOT NULL REFERENCES report_sections(id) ON DELETE CASCADE,
  report_structure_id UUID NOT NULL REFERENCES report_structures(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  row_group TEXT NOT NULL,
  data_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_slice_id, report_section_id, report_structure_id, row_number)
);

CREATE INDEX idx_report_data_slice_section ON report_data(report_slice_id, report_section_id);
CREATE INDEX idx_report_data_row ON report_data(report_slice_id, report_section_id, row_number);
CREATE INDEX idx_report_data_structure ON report_data(report_structure_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Get report section data (pivoted)
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

-- Function: Save cell value (upsert)
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

-- Function: Copy from previous slice
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

-- ============================================================================
-- MATERIALIZED VIEW
-- ============================================================================

-- Report summary view
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

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_structure_lookups ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_slices ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_data ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view their projects"
  ON projects FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = projects.id
    )
    OR
    is_active = true
  );

CREATE POLICY "Admins can manage all projects"
  ON projects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Report slices policies
CREATE POLICY "Users can view project slices"
  ON report_slices FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can modify project slices"
  ON report_slices FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
    )
  );

-- Report data policies
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

-- Admin tables (Designs, Sections, Structures)
CREATE POLICY "Admins can manage designs"
  ON report_designs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view active designs"
  ON report_designs FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage sections"
  ON report_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view sections"
  ON report_sections FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage structures"
  ON report_structures FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view structures"
  ON report_structures FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage lookups"
  ON report_structure_lookups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view lookups"
  ON report_structure_lookups FOR SELECT
  USING (is_active = true);

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================

-- Create storage bucket for images (run this via Supabase Dashboard or manually)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('report-images', 'report-images', true);

-- Storage policies will be created separately in the dashboard

-- ============================================================================
-- INITIAL DATA (Optional)
-- ============================================================================

-- Create default admin role for first user (update with your user ID)
-- INSERT INTO user_roles (user_id, role)
-- VALUES ('YOUR-USER-UUID-HERE', 'admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Create storage bucket 'report-images' in Supabase Dashboard
-- 2. Add your user as admin in user_roles table
-- 3. Test with sample data
-- ============================================================================
