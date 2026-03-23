-- ==============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_court_settings ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 1. Profiles (ผู้ใช้งาน)
-- ==============================================================================
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ==============================================================================
-- 2. Public Read Data (ข้อมูลสาธารณะที่หน้าเว็บลูกค้าต้องดึงไปแสดง)
-- ==============================================================================
CREATE POLICY "Public read tables" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public read restaurants" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Public read menus" ON public.menus FOR SELECT USING (true);
CREATE POLICY "Public read settings" ON public.food_court_settings FOR SELECT USING (true);
CREATE POLICY "Public read vendor assignments" ON public.vendor_assignments FOR SELECT USING (true);

-- ==============================================================================
-- 3. Sessions (ข้อมูลโต๊ะและการเริ่มสั่งอาหารของลูกค้า)
-- ==============================================================================
CREATE POLICY "Anyone can create sessions" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Vendors/Admins can update sessions" ON public.sessions FOR UPDATE USING (auth.role() = 'authenticated');

-- ==============================================================================
-- 4. Orders & Order Items (รายการคำสั่งซื้อ)
-- ==============================================================================
CREATE POLICY "Enable read access for all users" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.orders FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.order_items FOR UPDATE USING (auth.role() = 'authenticated');

-- ==============================================================================
-- 5. Payments (การชำระเงิน)
-- ==============================================================================
CREATE POLICY "Enable read access for all users" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.payments FOR UPDATE USING (auth.role() = 'authenticated');

-- ==============================================================================
-- 6. Order Status Logs (ประวัติสถานะ)
-- ==============================================================================
CREATE POLICY "Enable read access for all users" ON public.order_status_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.order_status_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.order_status_logs FOR UPDATE USING (auth.role() = 'authenticated');

-- ==============================================================================
-- 7. Stock Alerts (แจ้งเตือนของหมด)
-- ==============================================================================
CREATE POLICY "Enable read access for authenticated users" ON public.stock_alerts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.stock_alerts FOR UPDATE USING (auth.role() = 'authenticated');

-- ==============================================================================
-- 8. Menus (การจัดการเมนูของ Vendor)
-- ==============================================================================
-- ให้ authenticated users (Vendor/Admin) จัดการเมนูได้ 
CREATE POLICY "Authenticated users can manage menus" ON public.menus FOR ALL USING (auth.role() = 'authenticated');
