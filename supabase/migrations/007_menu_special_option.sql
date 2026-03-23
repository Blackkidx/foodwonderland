-- Migration: Add per-menu special option support
-- Vendors can now enable/disable a "special" price option per menu item
ALTER TABLE public.menus ADD COLUMN has_special_option BOOLEAN DEFAULT false;
ALTER TABLE public.menus ADD COLUMN special_option_price DECIMAL(10,2) DEFAULT 10.00;
