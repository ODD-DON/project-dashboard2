-- Create invoice counters table to track invoice numbers per brand
CREATE TABLE IF NOT EXISTS invoice_counters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL UNIQUE,
  current_number INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial counters for each brand
INSERT INTO invoice_counters (brand, current_number) 
VALUES 
  ('Wami Live', 1),
  ('Luck On Fourth', 1),
  ('The Hideout', 1)
ON CONFLICT (brand) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoice_counters_brand ON invoice_counters(brand);

-- Enable Row Level Security
ALTER TABLE invoice_counters ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow all operations on invoice_counters" ON invoice_counters;

-- Create policy for full access
CREATE POLICY "Allow all operations on invoice_counters" ON invoice_counters
  FOR ALL USING (true);

-- Create function to get and increment invoice number atomically
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

-- Verify the setup worked
SELECT 'Invoice counters table created successfully' as status;

-- Show current state
SELECT 
  brand,
  current_number,
  updated_at
FROM invoice_counters 
ORDER BY brand;

-- Test the function
SELECT 
  'Wami Live' as brand,
  get_next_invoice_number('Wami Live') as next_number;

-- Reset the counter back to 1 for Wami Live after test
UPDATE invoice_counters 
SET current_number = 1 
WHERE brand = 'Wami Live';

-- Final verification
SELECT 
  brand,
  current_number as ready_for_next_invoice
FROM invoice_counters 
ORDER BY brand;
