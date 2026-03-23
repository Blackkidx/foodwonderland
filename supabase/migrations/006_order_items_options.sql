-- Migration: Add options and note columns to order_items
ALTER TABLE public.order_items ADD COLUMN options TEXT;
ALTER TABLE public.order_items ADD COLUMN note TEXT;
