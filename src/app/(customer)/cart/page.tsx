'use client'

import { useCartStore } from '@/store/cartStore'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Store, ArrowRight, Wallet } from 'lucide-react'

export default function CartPage() {
  const { cart, removeItem, updateQuantity, getRestaurantTotal } = useCartStore()

  const grandTotal = cart.reduce((sum, r) => sum + getRestaurantTotal(r.restaurantId), 0)

  if (cart.length === 0) {
    return (
      <div className="py-16 sm:py-24 flex flex-col items-center justify-center text-center space-y-5 sm:space-y-6 animate-fade-in px-2">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">ตะกร้าว่างเปล่า</h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">ยังไม่มีอาหารในตะกร้าของคุณ ไปดูร้านอาหารอร่อยๆ กันเลย!</p>
        </div>
        <Link href="/restaurants">
          <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 sm:px-8 h-11 sm:h-12 text-sm sm:text-base font-bold shadow-md hover:shadow-lg transition-all active:scale-95">
            เลือกร้านอาหาร
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="py-3 sm:py-6 space-y-5 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-primary/5 rounded-full blur-3xl -mr-8 sm:-mr-10 -mt-8 sm:-mt-10" />
        <Link href="/restaurants">
          <Button variant="ghost" size="icon" className="rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-primary transition-colors w-9 h-9 sm:w-10 sm:h-10">
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
        </Link>
        <div className="flex-1 relative z-10">
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">ตะกร้าของฉัน</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            {cart.reduce((sum, group) => sum + group.items.length, 0)} รายการ
          </p>
        </div>
      </div>

      {/* Cart grouped by restaurant */}
      <div className="space-y-4 sm:space-y-6">
        {cart.map((group) => (
          <div key={group.restaurantId} className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-slide-up group">
            {/* Restaurant Header */}
            <div className="bg-primary/5 dark:bg-primary/10 border-b border-primary/10 px-3 sm:px-5 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
              <Store className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <h2 className="font-bold text-primary text-base sm:text-lg truncate">{group.restaurantName}</h2>
            </div>

            {/* Items */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {group.items.map((item) => (
                <div key={item.id} className="px-3 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base truncate">{item.menuName}</p>
                    {item.optionsText && (
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">{item.optionsText}</p>
                    )}
                    {item.noteText && (
                      <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-500 mt-0.5 truncate leading-tight">หมายเหตุ: {item.noteText}</p>
                    )}
                    <p className="text-primary font-bold text-xs sm:text-sm mt-0.5 sm:mt-1">฿{(item.price * item.quantity).toLocaleString()}</p>
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center flex-shrink-0">
                    <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-full border border-border/50 p-0.5 sm:p-1 shadow-inner">
                      <button
                        onClick={() =>
                          item.quantity === 1
                            ? removeItem(group.restaurantId, item.id)
                            : updateQuantity(group.restaurantId, item.id, item.quantity - 1)
                        }
                        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-700 shadow-sm hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-90 transition-all text-slate-700 dark:text-slate-300"
                      >
                        {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      </button>
                      <span className="w-7 sm:w-10 text-center text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(group.restaurantId, item.id, item.quantity + 1)}
                        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-700 shadow-sm hover:text-primary hover:bg-primary/10 active:scale-90 transition-all text-slate-700 dark:text-slate-300"
                      >
                        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal + Checkout */}
            <div className="px-3 sm:px-5 py-3 sm:py-4 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
                รวมร้านนี้: <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white ml-1 sm:ml-2">฿{getRestaurantTotal(group.restaurantId).toLocaleString()}</span>
              </p>
              <Link href={`/checkout/${group.restaurantId}`} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white rounded-full font-bold shadow-md hover:shadow-lg active:scale-95 transition-all text-sm h-10 sm:h-auto">
                  ชำระเงิน <ArrowRight className="w-4 h-4 ml-1.5 sm:ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Grand Total */}
      <div className="bg-slate-900 dark:bg-black text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 sm:w-48 h-36 sm:h-48 bg-primary/20 rounded-full blur-3xl -mr-16 sm:-mr-20 -mt-16 sm:-mt-20" />
        <div className="relative z-10 flex items-center gap-2 sm:gap-3">
          <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          <p className="font-bold text-sm sm:text-lg text-slate-300">ยอดรวมทุกร้าน</p>
        </div>
        <p className="text-2xl sm:text-3xl font-extrabold text-primary relative z-10">฿{grandTotal.toLocaleString()}</p>
      </div>

      <Link href="/restaurants" className="block outline-none pb-4 sm:pb-0">
        <Button variant="outline" className="w-full rounded-full h-11 sm:h-12 text-sm sm:text-base font-bold border-2 border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all active:scale-95">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" /> สั่งอาหารร้านอื่นเพิ่ม
        </Button>
      </Link>
    </div>
  )
}
