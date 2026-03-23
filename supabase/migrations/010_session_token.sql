-- Migration: Add session_token to orders table
-- ใช้สำหรับแยก "รอบการใช้งาน" ของลูกค้าแต่ละครั้งที่สแกน QR
-- ทุกครั้งที่สแกน QR จะได้ session_token ใหม่ (UUID)

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS session_token UUID;

-- Index สำหรับ query ออเดอร์ตาม session_token ได้เร็ว
CREATE INDEX IF NOT EXISTS idx_orders_session_token ON public.orders(session_token);
