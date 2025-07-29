-- Drop the existing function with security issues
DROP FUNCTION IF EXISTS get_next_invoice_number(TEXT);

-- Create the function with proper security settings
CREATE OR REPLACE FUNCTION get_next_invoice_number(brand_name TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Get current number and increment it atomically
  UPDATE public.invoice_counters 
  SET current_number = current_number + 1,
      updated_at = NOW()
  WHERE brand = brand_name
  RETURNING current_number INTO next_number;
  
  -- If brand doesn't exist, create it
  IF next_number IS NULL THEN
    INSERT INTO public.invoice_counters (brand, current_number)
    VALUES (brand_name, 2)
    RETURNING current_number INTO next_number;
    next_number := 1;
  END IF;
  
  RETURN next_number;
END;
$$;

-- Verify the function was created properly
SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_next_invoice_number'
  AND routine_schema = 'public';

-- Test the function
SELECT 'Testing function:' as status;
SELECT get_next_invoice_number('Test Brand') as test_result;

-- Clean up test data
DELETE FROM public.invoice_counters WHERE brand = 'Test Brand';

-- Show current counters
SELECT 
  brand,
  current_number,
  updated_at
FROM public.invoice_counters 
ORDER BY brand;

-- Verify the function security is fixed
SELECT 'Function security fixed - search_path is now immutable' as status;
