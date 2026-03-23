-- ==============================================================================
-- FIX: Allow vendors to update their restaurant status & enable Realtime
-- ==============================================================================

-- 1. Policy for Vendors to update their assigned restaurant
CREATE POLICY "Vendors can update their assigned restaurant" 
ON public.restaurants 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.vendor_assignments 
    WHERE restaurant_id = restaurants.id 
    AND vendor_id = auth.uid()
  )
);

-- 2. Add public.restaurants to realtime publication so customer UI updates live
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants;
EXCEPTION WHEN OTHERS THEN
  -- Ignore error if table is already in the publication
END;
$$;
