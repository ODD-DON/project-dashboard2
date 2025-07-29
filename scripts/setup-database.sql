-- Create the projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  brand TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  files JSONB DEFAULT '[]'::jsonb
);

-- Create an index on priority for faster sorting
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);

-- Create an index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Create an index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for now
-- In production, you'd want more restrictive policies
CREATE POLICY "Allow all operations on projects" ON projects
  FOR ALL USING (true);
