-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tables (โต๊ะ)
CREATE TABLE public.tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number INT UNIQUE NOT NULL,
  qr_token UUID UNIQUE DEFAULT uuid_generate_v4(),
  is_active BOOLEAN DEFAULT true
);

-- 2. Sessions (Session ลูกค้า)
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID REFERENCES public.tables(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- 3. Profiles (Vendor/Admin)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) CHECK (role IN ('vendor', 'super_admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Categories (หมวดหมู่ร้าน)
CREATE TABLE public.categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(50)
);

-- 5. Restaurants (ร้านอาหาร)
CREATE TABLE public.restaurants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id INT REFERENCES public.categories(id) ON DELETE SET NULL,
  logo_url TEXT,
  qr_payment_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Vendor Assignments (Vendor ดูแลร้านไหน)
CREATE TABLE public.vendor_assignments (
  id SERIAL PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id INT REFERENCES public.restaurants(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vendor_id, restaurant_id)
);

-- 7. Menus (เมนูอาหาร)
CREATE TABLE public.menus (
  id SERIAL PRIMARY KEY,
  restaurant_id INT REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  stock INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 5,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Orders (คำสั่งซื้อ)
CREATE TABLE public.orders (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  restaurant_id INT REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  table_number INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','paid','cooking','ready','picked_up','cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Order Items (รายการอาหารใน Order)
CREATE TABLE public.order_items (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_id INT REFERENCES public.menus(id) ON DELETE SET NULL,
  menu_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL
);

-- 10. Payments (การชำระเงิน)
CREATE TABLE public.payments (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES public.orders(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  slip_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Order Status Logs (บันทึกสถานะ)
CREATE TABLE public.order_status_logs (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Stock Alerts (แจ้งเตือนของใกล้หมด)
CREATE TABLE public.stock_alerts (
  id SERIAL PRIMARY KEY,
  menu_id INT REFERENCES public.menus(id) ON DELETE CASCADE,
  restaurant_id INT REFERENCES public.restaurants(id) ON DELETE CASCADE,
  current_stock INT,
  threshold INT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Food Court Settings (ตั้งค่าศูนย์อาหาร)
CREATE TABLE public.food_court_settings (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) DEFAULT 'FoodWonderland',
  logo_url TEXT,
  session_timeout_minutes INT DEFAULT 60
);

-- ==============================================================================
-- TEMPORARY DISABLE RLS (สำหรับช่วง Development)
-- ค่อยใส่ Policy เต็มๆ ตอน Phase ท้ายๆ
-- ==============================================================================
ALTER TABLE public.tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_court_settings DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- SETUP SUPABASE REALTIME
-- ==============================================================================
begin;
  -- ลบ publication เก่า (ถ้ามี)
  drop publication if exists supabase_realtime;
  -- สร้างใหม่
  create publication supabase_realtime;
commit;
-- เพิ่ม table ที่ต้องการ realtime
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_status_logs;

-- ==============================================================================
-- SEED DATA (ข้อมูลทดสอบ)
-- ==============================================================================
INSERT INTO public.categories (name, icon) VALUES 
('อาหารไทย / ส้มตำ', '🌶️'),
('ก๋วยเตี๋ยว', '🍜'),
('เครื่องดื่ม / ของหวาน', '🧋');

INSERT INTO public.restaurants (name, category_id, logo_url, qr_payment_url) VALUES
('เจ๊นก ส้มตำแซ่บ', 1, NULL, NULL),
('เฮียตี๋ ก๋วยเตี๋ยวเรือ', 2, NULL, NULL),
('ชาโคตรหอม', 3, NULL, NULL);

INSERT INTO public.menus (restaurant_id, name, description, price, stock, low_stock_threshold) VALUES
(1, 'ส้มตำไทย', 'ส้มตำไทยเปรี้ยวหวาน', 45.00, 50, 10),
(1, 'ส้มตำปูปลาร้า', 'นัวร์ๆ', 50.00, 40, 10),
(1, 'ไก่ย่าง 1 ไม้', 'ไก่ย่างวิเชียร', 20.00, 30, 5),
(2, 'ก๋วยเตี๋ยวเรือน้ำตกหมู', 'เส้นเล็กน้ำตก', 50.00, 100, 20),
(2, 'ก๋วยเตี๋ยวเรือเนื้อเปื่อย', 'เส้นเล็กรวมเนื้อ', 60.00, 50, 10),
(3, 'ชานมไข่มุก', 'หวาน 100%', 45.00, 80, 20),
(3, 'ชาไทยไข่มุก', 'หอมชาไทยแท้', 45.00, 80, 20);

INSERT INTO public.tables (table_number) VALUES (1), (2), (3), (4), (5);
