-- ==============================================================================
-- SQL สำหรับรัน Supabase SQL Editor (สร้างครั้งเดียว)
-- ==============================================================================

-- 1. Function สำหรับหัก stock
CREATE OR REPLACE FUNCTION public.decrement_stock(menu_id INT, qty INT)
RETURNS void AS $$
BEGIN
  UPDATE public.menus 
  SET stock = GREATEST(0, stock - qty)
  WHERE id = menu_id;

  -- ถ้า stock หลังหัก <= threshold ให้สร้าง alert
  INSERT INTO public.stock_alerts (menu_id, restaurant_id, current_stock, threshold)
  SELECT m.id, m.restaurant_id, m.stock, m.low_stock_threshold
  FROM public.menus m
  WHERE m.id = menu_id
    AND m.stock <= m.low_stock_threshold;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger อัปเดต updated_at อัตโนมัติ
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
