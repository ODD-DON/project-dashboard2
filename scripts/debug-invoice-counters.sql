-- Check if the table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'invoice_counters'
    ) 
    THEN 'invoice_counters table EXISTS' 
    ELSE 'invoice_counters table MISSING' 
  END as table_status;

-- Check if the function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'get_next_invoice_number'
    ) 
    THEN 'get_next_invoice_number function EXISTS' 
    ELSE 'get_next_invoice_number function MISSING' 
  END as function_status;

-- If table exists, show current data
SELECT 
  brand,
  current_number,
  updated_at
FROM invoice_counters 
ORDER BY brand;

-- Create table if it doesn't exist (backup)
CREATE TABLE IF NOT EXISTS invoice_counters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL UNIQUE,
  current_number INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial data if missing
INSERT INTO invoice_counters (brand, current_number) 
VALUES 
  ('Wami Live', 1),
  ('Luck On Fourth', 1),
  ('The Hideout', 1)
ON CONFLICT (brand) DO NOTHING;

-- Enable RLS
ALTER TABLE invoice_counters ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS "Allow all operations on invoice_counters" ON invoice_counters;
CREATE POLICY "Allow all operations on invoice_counters" ON invoice_counters
  FOR ALL USING (true);

-- Recreate the function (backup)
CREATE OR REPLACE FUNCTION get_next_invoice_number(brand_name TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Get current number and increment it atomically
  UPDATE invoice_counters 
  SET current_number = current_number + 1,
      updated_at = NOW()
  WHERE brand = brand_name
  RETURNING current_number INTO next_number;
  
  -- If brand doesn't exist, create it
  IF next_number IS NULL THEN
    INSERT INTO invoice_counters (brand, current_number)
    VALUES (brand_name, 2)
    RETURNING current_number INTO next_number;
    next_number := 1;
  END IF;
  
  RETURN next_number;
END;
$$;

-- Test the setup
SELECT 'Setup completed - testing function:' as status;

-- Final verification
SELECT 
  brand,
  current_number
FROM invoice_counters 
ORDER BY brand;
