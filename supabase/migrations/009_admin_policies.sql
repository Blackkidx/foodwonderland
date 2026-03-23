-- ==============================================================================
-- FIX: Allow Admins (and all authenticated users) to manage core tables
-- ==============================================================================

-- Allow authenticated users to manage restaurants
CREATE POLICY "Authenticated users can manage restaurants" 
ON public.restaurants 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage categories
CREATE POLICY "Authenticated users can manage categories" 
ON public.categories 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage vendor_assignments
CREATE POLICY "Authenticated users can manage vendor assignments" 
ON public.vendor_assignments 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage tables
CREATE POLICY "Authenticated users can manage tables" 
ON public.tables 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage food_court_settings
CREATE POLICY "Authenticated users can manage food court settings" 
ON public.food_court_settings 
FOR ALL 
USING (auth.role() = 'authenticated');
