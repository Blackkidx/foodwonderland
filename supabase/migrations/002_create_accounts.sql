-- ==============================================================================
-- STEP 1: ไปที่ Supabase Dashboard → Authentication → Users → Add User
-- สร้าง users เหล่านี้ก่อน แล้วค่อยรัน SQL ด้านล่าง
-- ==============================================================================

-- Super Admin account:
--   Email: admin@foodwonderland.com
--   Password: Admin@1234
--
-- Vendor 1 (ร้านส้มตำ):
--   Email: somtam@foodwonderland.com
--   Password: Vendor@1234
--
-- Vendor 2 (ร้านก๋วยเตี๋ยว):
--   Email: noodle@foodwonderland.com
--   Password: Vendor@1234
--
-- Vendor 3 (ร้านชานม):
--   Email: tea@foodwonderland.com
--   Password: Vendor@1234

-- ==============================================================================
-- STEP 2: รัน SQL นี้ทันทีหลังสร้าง users แล้ว
-- (แทนที่ UUID ด้วย ID จริงจาก Authentication → Users)
-- ==============================================================================

-- ดึง UUID ของแต่ละ user มาก่อน (รัน query นี้เพื่อดู)
SELECT id, email FROM auth.users ORDER BY created_at;

-- ==============================================================================
-- หลังได้ UUID แล้ว ให้รัน INSERT เหล่านี้ (แทนที่ REPLACE_WITH_UUID_XXX ด้วย UUID จริง)
-- ==============================================================================

-- INSERT profiles
INSERT INTO public.profiles (id, full_name, role) VALUES
('REPLACE_WITH_UUID_ADMIN', 'Super Admin', 'super_admin'),
('REPLACE_WITH_UUID_SOMTAM', 'เจ๊นก (ส้มตำ)', 'vendor'),
('REPLACE_WITH_UUID_NOODLE', 'เฮียตี๋ (ก๋วยเตี๋ยว)', 'vendor'),
('REPLACE_WITH_UUID_TEA', 'แอน (ชาโคตรหอม)', 'vendor');

-- Assign vendor เข้าร้าน (restaurant_id: 1=ส้มตำ, 2=ก๋วยเตี๋ยว, 3=ชานม)
INSERT INTO public.vendor_assignments (vendor_id, restaurant_id) VALUES
('REPLACE_WITH_UUID_SOMTAM', 1),
('REPLACE_WITH_UUID_NOODLE', 2),
('REPLACE_WITH_UUID_TEA', 3);
