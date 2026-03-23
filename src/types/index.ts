// Database Types
export interface Restaurant {
  id: number
  name: string
  category_id: number
  logo_url: string | null
  qr_payment_url: string | null
  is_active: boolean
  avg_rating?: number
  review_count?: number
  created_at: string
}

export interface Menu {
  id: number
  restaurant_id: number
  name: string
  description: string | null
  price: number
  image_url: string | null
  stock: number
  low_stock_threshold: number
  is_available: boolean
  has_special_option: boolean
  special_option_price: number
  created_at: string
}

export interface Order {
  id: number
  session_id: string
  restaurant_id: number
  customer_name: string
  table_number: number
  total: number
  status: 'pending' | 'paid' | 'cooking' | 'ready' | 'picked_up' | 'cancelled'
  created_at: string
  updated_at: string
  restaurant?: Restaurant
}

export interface OrderItem {
  id: number
  order_id: number
  menu_id: number
  menu_name: string
  quantity: number
  price: number
  options?: string | null
  note?: string | null
}

export interface Payment {
  id: number
  order_id: number
  amount: number
  slip_url: string | null
  status: 'pending' | 'verified' | 'rejected'
  verified_by: string | null
  verified_at: string | null
  created_at: string
}

export interface TableRecord {
  id: string
  table_number: number
  qr_token: string
  is_active: boolean
}

export interface Session {
  id: string
  table_id: string
  customer_name: string
  started_at: string
  ended_at: string | null
  is_active: boolean
  table?: TableRecord
}

export interface Profile {
  id: string
  full_name: string
  role: 'vendor' | 'super_admin'
  avatar_url: string | null
  created_at: string
}

// Cart Types (client-side only)
export interface CartItem {
  id: string
  menuId: number
  menuName: string
  price: number
  quantity: number
  imageUrl: string | null
  optionsText?: string
  noteText?: string
}

export interface CartByRestaurant {
  restaurantId: number
  restaurantName: string
  items: CartItem[]
}
