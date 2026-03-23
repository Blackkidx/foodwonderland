'use client'

import { createClient } from '@/lib/supabase/client'
import { use, useEffect, useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Minus, Plus, ArrowLeft, ShoppingCart, Utensils, Info, Star, Clock, Flame, Image as ImageIcon, X } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { Menu, Restaurant } from '@/types'
import Link from 'next/link'

export default function MenuPage({ params }: { params: Promise<{ restaurant_id: string }> }) {
  const { restaurant_id } = use(params)
  const [menus, setMenus] = useState<Menu[]>([])
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Modal State
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null)

  const { cart, addItem, updateQuantity, removeItem, tableNumber, getRestaurantTotal } = useCartStore()
  const supabase = createClient()
  const restaurantId = parseInt(restaurant_id)

  useEffect(() => {
    async function fetchData() {
      const [{ data: restData }, { data: menuData }, { data: ratingData }] = await Promise.all([
        supabase.from('restaurants').select('*').eq('id', restaurantId).single(),
        supabase.from('menus').select('*').eq('restaurant_id', restaurantId).order('id'),
        supabase.rpc('get_restaurant_rating', { rest_id: restaurantId })
      ])
      
      let finalRest = restData
      if (restData && ratingData && ratingData.length > 0) {
        finalRest = {
          ...restData,
          avg_rating: ratingData[0].avg_rating,
          review_count: ratingData[0].review_count
        }
      }

      if (finalRest) setRestaurant(finalRest)
      if (menuData) setMenus(menuData)
      setLoading(false)
    }
    fetchData()
  }, [restaurantId])

  // ── Cart / Options Logic ─────────────────────────────────────────────
  const cartGroup = cart.find(r => r.restaurantId === restaurantId)
  
  // Memoize quantities to prevent O(N) operations inside loops and reduce lag
  const { menuItemsMap, menuQtyMap } = useMemo(() => {
    const itemsMap = new Map<number, any[]>()
    const qtyMap = new Map<number, number>()
    
    if (cartGroup?.items) {
      cartGroup.items.forEach(item => {
        if (!itemsMap.has(item.menuId)) itemsMap.set(item.menuId, [])
        itemsMap.get(item.menuId)!.push(item)
        qtyMap.set(item.menuId, (qtyMap.get(item.menuId) || 0) + item.quantity)
      })
    }
    return { menuItemsMap: itemsMap, menuQtyMap: qtyMap }
  }, [cartGroup?.items])

  const getCartItemsForMenu = useCallback((menuId: number) => menuItemsMap.get(menuId) || [], [menuItemsMap])
  const getTotalQtyForMenu = useCallback((menuId: number) => menuQtyMap.get(menuId) || 0, [menuQtyMap])

  const openOptionsModal = (menu: Menu) => {
    setSelectedMenu(menu)
  }

  const handleMinusClick = (menu: Menu) => {
    const items = getCartItemsForMenu(menu.id)
    if (items.length > 1) {
      toast.info('กรุณาแก้ไขจำนวนที่หน้าตะกร้าของคุณ', { description: 'เมนูนี้มีตัวเลือกพิเศษที่แตกต่างกัน' })
      return
    }
    if (items.length === 1) {
      const item = items[0]
      if (item.quantity === 1) removeItem(restaurantId, item.id)
      else updateQuantity(restaurantId, item.id, item.quantity - 1)
    }
  }

  const handleAddToCart = (itemConfig: { optionValue: string, note: string, tempQty: number }) => {
    if (!selectedMenu) return
    if (!tableNumber) {
      toast.error('กรุณาสแกน QR โต๊ะก่อนสั่งอาหาร', { icon: <Info className="w-5 h-5 text-destructive" /> })
      return
    }

    let optionsText = ''
    let extraPrice = 0
    if (itemConfig.optionValue === 'special') { 
      const sp = selectedMenu.special_option_price ?? 10
      optionsText = `พิเศษ (+${sp} บาท)`
      extraPrice = sp
    }

    const finalPrice = selectedMenu.price + extraPrice
    // Unique ID based on combination
    const cartItemId = `${selectedMenu.id}-${itemConfig.optionValue}-${itemConfig.note.trim()}`

    addItem(restaurantId, restaurant?.name ?? '', {
      id: cartItemId,
      menuId: selectedMenu.id,
      menuName: selectedMenu.name,
      price: finalPrice,
      quantity: itemConfig.tempQty,
      imageUrl: selectedMenu.image_url,
      optionsText: optionsText || undefined,
      noteText: itemConfig.note.trim() || undefined
    })
    
    // Use requestAnimationFrame to delay toast to prevent blocking the UI render
    requestAnimationFrame(() => {
      toast.success(`เพิ่ม ${selectedMenu.name} แล้ว`, { icon: <ShoppingCart className="w-5 h-5 text-green-500" /> })
    })
    setSelectedMenu(null)
  }

  // ── Derived Data ───────────────────────────────────────────────────────
  const popularMenus = useMemo(() => menus.slice(0, 3), [menus]) 
  const otherMenus = useMemo(() => menus, [menus]) 
  const cartTotal = getRestaurantTotal(restaurantId)
  const cartItemCount = cartGroup?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0

  if (loading) {
    return (
      <div className="w-full animate-pulse">
        <div className="h-48 sm:h-64 bg-slate-200 dark:bg-slate-800 w-full rounded-b-3xl"></div>
        <div className="px-4 -mt-10 relative z-10 space-y-6 max-w-5xl mx-auto">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm h-32"></div>
          <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`pb-24 animate-fade-in sm:pt-4`}>
      
      {/* ── 1. Hero Banner ──────────────────────────────────────────────── */}
      <div className="relative w-full h-48 sm:h-64 md:h-80 bg-slate-100 dark:bg-slate-800 sm:rounded-3xl overflow-hidden shadow-sm group">
        {restaurant?.logo_url ? (
          <>
            <img src={restaurant.logo_url} alt="Cover" className="w-full h-full object-cover filter blur-xl opacity-60 scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-orange-400 to-amber-500" />
        )}

        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
          <Link href="/restaurants">
            <Button variant="ghost" size="icon" className="rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white border border-white/30 h-10 w-10 active:scale-95 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-0 relative mb-20">
        {/* ── 2. Restaurant Info Card ───────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-800 -mt-8 sm:-mt-16 mx-2 sm:mx-6 relative z-10 flex flex-col sm:flex-row gap-4 items-center sm:items-start text-center sm:text-left">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[5px] border-white dark:border-slate-900 shadow-md overflow-hidden bg-slate-50 dark:bg-slate-800 flex-shrink-0 -mt-12 sm:-mt-14">
            {restaurant?.logo_url ? (
              <img src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary"><Utensils className="w-8 h-8"/></div>
            )}
          </div>
          
          <div className="flex-1 space-y-1.5 min-w-0 w-full">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white truncate">{restaurant?.name}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1 text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
                <Star className="w-3.5 h-3.5 fill-current" /> 
                {restaurant?.review_count && restaurant.review_count > 0 
                  ? `${restaurant.avg_rating} (${restaurant.review_count}+)` 
                  : 'ยังไม่มีรีวิว'}
              </span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 10-15 นาที</span>
            </div>
            {/* Promo text */}
            <p className="text-primary font-bold text-xs sm:text-sm mt-1">ออเดอร์ร้อนๆ พร้อมเสิร์ฟถึงโต๊ะคุณ 😋</p>
          </div>
        </div>

        {/* ── 3. Popular Menus (Horizontal) ──────────────────────── */}
        {popularMenus.length > 0 && (
          <div className="mt-8 mb-6 sm:px-6">
            <div className="px-2 sm:px-0 mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 animate-pulse" />
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">เมนูยอดฮิต</h2>
            </div>
            
            <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-4 px-2 sm:px-0 snap-x">
              {popularMenus.map((menu) => {
                const totalQty = getTotalQtyForMenu(menu.id)
                const outOfStock = menu.stock === 0 || !menu.is_available

                return (
                  <div key={`pop-${menu.id}`} className="snap-start flex-shrink-0 w-[160px] sm:w-[200px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-2 hover:shadow-md transition-shadow flex flex-col group cursor-pointer" onClick={() => !outOfStock && openOptionsModal(menu)}>
                    <div className="w-full h-[120px] sm:h-[140px] rounded-[20px] bg-slate-50 dark:bg-slate-800 overflow-hidden relative mb-2">
                      {menu.image_url ? (
                        <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600"><ImageIcon className="w-8 h-8"/></div>
                      )}
                      {outOfStock && (
                        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center backdrop-blur-[2px]">
                          <Badge variant="destructive" className="font-bold text-xs scale-90">หมด</Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between px-1">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 leading-snug">{menu.name}</h3>
                        <p className="text-primary font-extrabold mt-1 text-sm">฿{menu.price.toLocaleString()}</p>
                      </div>
                      <div className="mt-2 text-right" onClick={e => e.stopPropagation()}>
                        {renderQuantityControls(menu, totalQty, outOfStock, openOptionsModal, handleMinusClick)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 4. Main Menu List ──────────────────────────────── */}
        <div className="mt-6 sm:px-6">
          <div className="px-2 sm:px-0 mb-4 sticky top-0 bg-gradient-to-b from-slate-50/90 to-transparent dark:from-background py-2 z-10 backdrop-blur-sm">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">เมนูทั้งหมด</h2>
          </div>

          <div className="space-y-4 px-2 sm:px-0">
            {otherMenus.map((menu) => {
              const totalQty = getTotalQtyForMenu(menu.id)
              const outOfStock = menu.stock === 0 || !menu.is_available

              return (
                <div key={menu.id} onClick={() => !outOfStock && openOptionsModal(menu)} className={`bg-white dark:bg-slate-900 rounded-3xl border-b border-l border-r border-t border-slate-100 dark:border-slate-800/60 shadow-sm p-3 sm:p-4 flex gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${outOfStock ? 'opacity-60 grayscale-[0.5] cursor-not-allowed' : ''}`}>
                  
                  {/* Image (Left) */}
                  <div className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-2xl bg-slate-50 dark:bg-slate-800 overflow-hidden relative flex-shrink-0 shadow-inner">
                    {menu.image_url ? (
                      <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="w-8 h-8"/></div>
                    )}
                  </div>

                  {/* Info (Right) */}
                  <div className="flex-1 min-w-0 flex flex-col py-1">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg leading-tight line-clamp-2">{menu.name}</h3>
                    {menu.description && (
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{menu.description}</p>
                    )}
                    
                    <div className="mt-auto flex items-end justify-between">
                      <p className="text-slate-900 dark:text-white font-extrabold text-base">฿{menu.price.toLocaleString()}</p>
                      <div className="w-[80px] sm:w-[90px]" onClick={e => e.stopPropagation()}>
                        {outOfStock ? (
                          <div className="w-full h-8 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center text-xs font-bold">หมด</div>
                        ) : (
                          renderQuantityControls(menu, totalQty, outOfStock, openOptionsModal, handleMinusClick)
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── 5. Sticky Floating Cart (LINE MAN style) ───────────────────── */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-4 left-0 right-0 px-4 sm:px-6 z-40 flex justify-center animate-slide-up">
          <Link href="/cart" className="w-full max-w-lg">
            <Button className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-white font-extrabold shadow-xl shadow-primary/30 flex items-center justify-between px-6 transition-transform active:scale-95">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 px-3 py-1 rounded-full text-sm">
                  {cartItemCount}
                </div>
                <span className="text-base">ดูตะกร้าของฉัน</span>
              </div>
              <span className="text-lg">฿{cartTotal.toLocaleString()}</span>
            </Button>
          </Link>
        </div>
      )}

      {/* ── 6. Options Modal Component ───────────────────────────────────────────── */}
      <OptionsModal 
        selectedMenu={selectedMenu} 
        onClose={() => setSelectedMenu(null)}
        onAddToCart={handleAddToCart}
        categoryId={restaurant?.category_id}
      />

    </div>
  )
}

function OptionsModal({ 
  selectedMenu, 
  onClose, 
  onAddToCart,
  categoryId
}: { 
  selectedMenu: Menu | null; 
  onClose: () => void;
  onAddToCart: (config: { optionValue: string, note: string, tempQty: number }) => void;
  categoryId?: number;
}) {
  const [optionValue, setOptionValue] = useState('normal')
  const [note, setNote] = useState('')
  const [tempQty, setTempQty] = useState(1)

  useEffect(() => {
    if (selectedMenu) {
      setOptionValue('normal')
      setNote('')
      setTempQty(1)
    }
  }, [selectedMenu])

  const extraPrice = optionValue === 'special' ? (selectedMenu?.special_option_price ?? 10) : 0

  let hintText = "เช่น เผ็ดน้อย ไม่ใส่ผัก"
  if (categoryId === 3) {
    hintText = "เช่น หวานน้อย ไม่ใส่น้ำแข็ง"
  } else if (categoryId === 2) {
    hintText = "เช่น เส้นหมี่ ไม่งอก"
  } else if (categoryId === 1) {
    hintText = "เช่น เผ็ดน้อย ไม่ใส่ชูรส"
  }

  return (
    <Dialog open={!!selectedMenu} onOpenChange={(val) => !val && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md bg-white dark:bg-slate-900 rounded-[28px] overflow-hidden p-0 gap-0 shadow-2xl border-0 border-t border-slate-100 dark:border-slate-800">
        {selectedMenu && (
          <div className="flex flex-col max-h-[85vh]">
            {/* Header Image */}
            <div className="relative h-48 bg-slate-100 dark:bg-slate-800 w-full flex-shrink-0">
              {selectedMenu.image_url ? (
                <img src={selectedMenu.image_url} alt={selectedMenu.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              {/* Gradient fade */}
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent dark:from-slate-900" />
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Price */}
            <div className="px-6 pt-2 pb-5 flex-shrink-0 border-b border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">{selectedMenu.name}</h2>
                  {selectedMenu.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{selectedMenu.description}</p>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-primary">฿{selectedMenu.price.toLocaleString()}</h3>
              </div>
            </div>

            {/* Scrollable Form Content */}
            <div className="overflow-y-auto px-6 py-5 space-y-7 custom-scrollbar flex-1">
              {/* Special Options Section — shown only if menu has special option enabled */}
              {selectedMenu.has_special_option && (
                <div className="space-y-4">
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-base">ตัวเลือกพิเศษ</h4>
                  <div className="space-y-3">
                    <label className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-colors cursor-pointer ${optionValue === 'normal' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" value="normal" checked={optionValue === 'normal'} onChange={() => setOptionValue('normal')} className="w-5 h-5 accent-primary" />
                        <span className="font-bold text-slate-700 dark:text-slate-300">ธรรมดา (ราคาปกติ)</span>
                      </div>
                      <span className="font-bold text-slate-400">+฿0</span>
                    </label>

                    <label className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-colors cursor-pointer ${optionValue === 'special' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" value="special" checked={optionValue === 'special'} onChange={() => setOptionValue('special')} className="w-5 h-5 accent-primary" />
                        <span className="font-bold text-slate-700 dark:text-slate-300">พิเศษ</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">+฿{selectedMenu.special_option_price.toLocaleString()}</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Note Section */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-base">ความต้องการพิเศษ ({hintText})</h4>
                <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เพิ่มเติมความอร่อยได้เลย..."
                  className="w-full h-24 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none placeholder-slate-400 font-medium"
                />
              </div>
            </div>

            {/* Action Footer */}
            <div className="px-6 py-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 flex-shrink-0">
              {/* Quantity Editor */}
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700 p-1">
                <button 
                  onClick={() => setTempQty(Math.max(1, tempQty - 1))}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-700 shadow-sm text-slate-700 dark:text-slate-300 active:scale-90 transition-transform"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="font-extrabold text-lg w-6 text-center">{tempQty}</span>
                <button 
                  onClick={() => setTempQty(tempQty + 1)}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-700 shadow-sm text-primary active:scale-90 transition-transform"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              {/* Add to cart Button */}
              <Button 
                onClick={() => onAddToCart({ optionValue, note, tempQty })}
                className="flex-1 h-14 rounded-full font-extrabold bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95 text-base flex justify-between items-center px-5"
              >
                <span>เพิ่มลงตะกร้า</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">฿{((selectedMenu.price + extraPrice) * tempQty).toLocaleString()}</span>
              </Button>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Helper Component for + / - controls ─────────────────────────────────
function renderQuantityControls(
  menu: Menu, 
  qty: number, 
  outOfStock: boolean, 
  onAddClick: (menu: Menu) => void,
  onMinusClick: (menu: Menu) => void
) {
  if (outOfStock) return null

  if (qty === 0) {
    return (
      <Button
        size="sm"
        onClick={() => onAddClick(menu)}
        className="w-full rounded-full font-bold bg-primary hover:bg-primary/90 text-white shadow-md active:scale-95 transition-transform text-xs h-8 sm:h-9"
      >
        <Plus className="w-4 h-4 mr-0.5" /> เพิ่ม
      </Button>
    )
  }

  return (
    <div className="flex items-center justify-between bg-primary rounded-full p-0.5 h-8 sm:h-9 w-full shadow-md shadow-primary/20 animate-fade-in">
      <button
        onClick={() => onMinusClick(menu)}
        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-white text-primary hover:bg-slate-50 active:scale-90 transition-all outline-none"
      >
        <Minus className="w-3.5 h-3.5 stroke-[3]" />
      </button>
      <span className="flex-1 text-center text-xs sm:text-sm font-extrabold text-white">{qty}</span>
      <button
        onClick={() => onAddClick(menu)} /* Opens modal again to add another distinct item */
        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-white text-primary hover:bg-slate-50 active:scale-90 transition-all outline-none leading-none pb-[1px]"
      >
        <Plus className="w-3.5 h-3.5 stroke-[3]" />
      </button>
    </div>
  )
}
