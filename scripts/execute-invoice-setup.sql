-- Execute the invoice tables setup script
-- This will create the necessary tables for invoice management

-- Create invoice projects table
CREATE TABLE IF NOT EXISTS invoice_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  brand TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  priority INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  files JSONB DEFAULT '[]'::jsonb,
  invoice_price DECIMAL(10,2) NOT NULL,
  added_to_invoice_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exported invoices table
CREATE TABLE IF NOT EXISTS exported_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  file_name TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  exported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_paid BOOLEAN DEFAULT FALSE,
  projects JSONB NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoice_projects_brand ON invoice_projects(brand);
CREATE INDEX IF NOT EXISTS idx_invoice_projects_project_id ON invoice_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_invoice_projects_added_at ON invoice_projects(added_to_invoice_at);
CREATE INDEX IF NOT EXISTS idx_exported_invoices_brand ON exported_invoices(brand);
CREATE INDEX IF NOT EXISTS idx_exported_invoices_exported_at ON exported_invoices(exported_at);

-- Enable Row Level Security
ALTER TABLE invoice_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE exported_invoices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on invoice_projects" ON invoice_projects;
DROP POLICY IF EXISTS "Allow all operations on exported_invoices" ON exported_invoices;

-- Create policies for full access (you can restrict these later)
CREATE POLICY "Allow all operations on invoice_projects" ON invoice_projects
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on exported_invoices" ON exported_invoices
  FOR ALL USING (true);

-- Verify tables were created successfully
SELECT 'invoice_projects table created' as status 
WHERE EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'invoice_projects'
);

SELECT 'exported_invoices table created' as status 
WHERE EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'exported_invoices'
);

-- Show table structures
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('invoice_projects', 'exported_invoices')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
