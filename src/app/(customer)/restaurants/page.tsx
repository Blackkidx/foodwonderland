'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useEffect, useState, useMemo, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Store, ChefHat, ChevronRight, WifiOff } from 'lucide-react'
import { Restaurant } from '@/types'

interface RestaurantWithMeta extends Restaurant {
  category_name?: string
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<RestaurantWithMeta[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current

    // ── 1. Initial fetch — ดึงทุกร้าน (เปิด + ปิด) เพื่อแสดงสถานะ
    async function fetchRestaurants() {
      const { data } = await supabase
        .from('restaurants')
        .select(`*, categories(name)`)
        .order('id')

      if (data) {
        setRestaurants(
          data.map((r: any) => ({ ...r, category_name: r.categories?.name ?? '' }))
        )
      }
      setLoading(false)
    }
    fetchRestaurants()

    // ── 2. Realtime subscription — อัปเดตสถานะทันทีเมื่อร้านเปิด/ปิด
    const channel = supabase
      .channel('restaurants-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'restaurants' },
        (payload) => {
          setRestaurants((prev) =>
            prev.map((r) =>
              r.id === payload.new.id
                ? { ...r, is_active: payload.new.is_active }
                : r
            )
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return restaurants
    return restaurants.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [search, restaurants])

  return (
    <div className="space-y-6 sm:space-y-8 py-2 sm:py-4 animate-fade-in">
      {/* Header & Search */}
      <div className="space-y-3 sm:space-y-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            อร่อยเด็ด ทั่วสารทิศ
          </h1>
          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mt-2">
            เลือกร้านที่คุณชอบ แล้วสั่งอาหารได้เลยทันที
          </p>
        </div>

        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 sm:h-6 sm:w-6 text-primary/60" />
          </div>
          <Input
            id="restaurant-search"
            placeholder="ค้นหาร้านอาหาร..."
            className="pl-11 sm:pl-14 h-12 sm:h-14 w-full bg-white dark:bg-slate-900 border-border/50 shadow-sm rounded-2xl focus-visible:ring-primary/30 transition-shadow text-base sm:text-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Restaurant Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-[80%]" />
                <Skeleton className="h-4 w-[60%]" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center space-y-4 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <ChefHat className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">ไม่พบร้านอาหาร</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm px-4">
              ลองค้นหาด้วยคำอื่นใหม่ดูนะ หรือดูร้านค้าอื่นๆ ที่เรามี
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 xl:gap-5">
          {filtered.map((restaurant) => {
            const isOpen = restaurant.is_active

            return (
              <div key={restaurant.id} className="group outline-none">
                {/* ถ้าปิดอยู่ → ห่อด้วย div ปกติให้คลิกไม่ได้; ถ้าเปิด → Link ปกติ */}
                {isOpen ? (
                  <Link href={`/menu/${restaurant.id}`} className="block">
                    <RestaurantCard restaurant={restaurant} isOpen={isOpen} />
                  </Link>
                ) : (
                  <RestaurantCard restaurant={restaurant} isOpen={isOpen} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── แยก Card ออกมาเพื่อความสะอาด
function RestaurantCard({ restaurant, isOpen }: { restaurant: RestaurantWithMeta; isOpen: boolean }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border p-3 sm:p-4 xl:p-5 flex items-center gap-3 sm:gap-4 xl:gap-5 transition-all duration-300 ${
      isOpen
        ? 'border-slate-100 dark:border-slate-800/60 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 dark:hover:border-primary/30 active:scale-[0.98]'
        : 'border-slate-100 dark:border-slate-800/40 opacity-60 grayscale-[0.4] cursor-not-allowed'
    }`}>
      {/* Logo */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 xl:w-24 xl:h-24 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/10 to-accent/20 flex items-center justify-center flex-shrink-0 overflow-hidden relative shadow-inner">
        {restaurant.logo_url ? (
          <img
            src={restaurant.logo_url}
            alt={restaurant.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <Store className="w-6 h-6 sm:w-8 sm:h-8 text-primary/50" />
        )}
        {/* Overlay badge when closed */}
        {!isOpen && (
          <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center rounded-xl sm:rounded-2xl">
            <WifiOff className="w-5 h-5 text-white/80" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <h2 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg truncate group-hover:text-primary transition-colors">
          {restaurant.name}
        </h2>

        {/* Category + Status dot */}
        <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span className={`relative flex h-2 w-2 flex-shrink-0`}>
            {/* Pulse ring only when open */}
            {isOpen && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isOpen ? 'bg-green-500' : 'bg-slate-400'}`} />
          </span>
          {restaurant.category_name}
        </p>

        {/* Open / Closed tag */}
        <span className={`w-fit text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full ${
          isOpen
            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
        }`}>
          {isOpen ? '● เปิดรับออเดอร์' : '● ปิดรับออเดอร์'}
        </span>
      </div>

      {/* Arrow — show only when open */}
      {isOpen && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all transform scale-90 group-hover:scale-100 flex-shrink-0">
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      )}
    </div>
  )
}
