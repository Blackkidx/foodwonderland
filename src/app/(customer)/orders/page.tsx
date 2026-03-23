'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useCartStore } from '@/store/cartStore'
import { Order, OrderItem } from '@/types'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Clock, CheckCircle, ChefHat, Check, ShieldCheck, XCircle, ChevronRight, X, Star, CreditCard, ShoppingBag, Send, Receipt, Plus, ArrowLeft, Loader2, PackageCheck, SearchX } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:    { label: 'รอตรวจสลิป', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
  paid:       { label: 'ชำระแล้ว รอทำ', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
  cooking:    { label: 'กำลังทำอาหาร', color: 'bg-primary/10 text-primary dark:bg-primary/20', icon: <ChefHat className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
  ready:      { label: 'เสร็จแล้ว! มารับได้', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
  picked_up:  { label: 'รับแล้ว', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: <PackageCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
  cancelled:  { label: 'ยกเลิก', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
}

interface OrderWithItems extends Order {
  order_items: OrderItem[]
  restaurant_name?: string
  reviews?: { id: number }[]
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  // ใช้ selector แยกเพื่อให้ Zustand ตรวจจับการเปลี่ยนแปลงได้แม่นยำ
  const sessionToken = useCartStore((s) => s.sessionToken)
  const supabase = createClient()

  // Review Modal State
  const [reviewOrder, setReviewOrder] = useState<OrderWithItems | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    // ล้างออเดอร์เก่าทันทีที่ token เปลี่ยน (ป้องกัน flash ข้อมูลเก่า)
    setOrders([])
    setLoading(true)

    // ดึง token ล่าสุดจาก store (หลัง hydrate เสร็จ)
    const token = useCartStore.getState().sessionToken
    if (!token) { setLoading(false); return }
    
    const fetchOrders = async () => {
      // ป้องกันกรณี token เป็น null หรือ undefined ซึ่งจะทำให้ Supabase ดึงข้อมูลทั้งหมดมา
      if (!token || token === 'undefined' || token === 'null') {
        setOrders([])
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*),
          restaurants(name),
          reviews(id)
        `)
        .eq('session_token', token)
        .order('created_at', { ascending: false })

      if (data) {
        setOrders(data.map((o: any) => ({ ...o, restaurant_name: o.restaurants?.name })))
      }
      setLoading(false)
    }

    fetchOrders()

    const playNotification = () => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('สถานะออเดอร์อัปเดต!', { body: 'ตรวจสอบสถานะออเดอร์ของคุณได้เลย', icon: '/favicon.ico' })
      }
    }

    const channel = supabase
      .channel(`orders-session-${token}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `session_token=eq.${token}` }, 
        (payload: any) => {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new as any } : o))
          if (payload.new.status === 'ready' || payload.new.status === 'cooking') {
            playNotification()
          }
        }
      )
      .subscribe()

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => { supabase.removeChannel(channel) }
  }, [sessionToken])

  const handleSubmitReview = async () => {
    if (!reviewOrder) return
    setSubmittingReview(true)
    try {
      const { error } = await supabase.from('reviews').insert({
        restaurant_id: reviewOrder.restaurant_id,
        order_id: reviewOrder.id,
        customer_name: reviewOrder.customer_name || 'ลูกค้าไม่ระบุชื่อ',
        rating,
        comment
      })
      if (error) throw error
      
      toast.success('ขอบคุณสำหรับรีวิวครับ! ⭐')
      
      // Update local state to hide the review button
      setOrders(prev => prev.map(o => 
        o.id === reviewOrder.id ? { ...o, reviews: [{ id: Date.now() }] } : o
      ))
      setReviewOrder(null)
    } catch (err: any) {
      toast.error('ส่งรีวิวไม่สำเร็จ ลองใหม่อีกครั้ง')
      console.error(err)
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) {
    return (
      <div className="py-3 sm:py-6 space-y-3 sm:space-y-4">
        <Skeleton className="h-8 sm:h-10 w-36 sm:w-48 rounded-xl" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 sm:h-48 w-full rounded-2xl sm:rounded-3xl" />)}
      </div>
    )
  }

  if (!sessionToken) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fade-in">
        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-2">
          <ShoppingBag className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">ยังไม่มีออเดอร์</h2>
        <p className="text-slate-500 max-w-[260px] text-sm">สั่งอาหารแล้ว ระบบจะแสดงสถานะออเดอร์และการเรียกคิวที่นี่</p>
        <Link href="/restaurants" className="mt-4 inline-block px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:-translate-y-1 transition-all">
          ไปเลือกร้านอาหารกันเลย
        </Link>
      </div>
    )
  }

  return (
    <div className="py-3 sm:py-6 space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between pb-2 border-b border-border/50 gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <Link href="/restaurants">
            <Button variant="ghost" size="icon" className="rounded-full bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 w-9 h-9 sm:w-10 sm:h-10 border border-slate-100 dark:border-slate-800 shadow-sm transition-all active:scale-95">
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">ออเดอร์ของฉัน</h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">ติดตามสถานะอาหารของคุณ</p>
          </div>
        </div>
        <div className="bg-primary/10 text-primary px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold flex-shrink-0">
          {orders.length} รายการ
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center space-y-4 sm:space-y-5 animate-slide-up">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary/5 rounded-full flex items-center justify-center text-primary/40">
            <SearchX className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">ยังไม่มีประวัติการสั่งซื้อ</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs px-2">คุณยังไม่ได้สั่งอาหารในรอบนี้นะ เลือกร้านอร่อยได้เลย!</p>
          </div>
          <Link href="/restaurants">
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 sm:px-8 h-11 sm:h-12 font-bold shadow-md hover:shadow-lg transition-all active:scale-95 text-sm sm:text-base">
              เริ่มสั่งอาหาร
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {orders.map((order, index) => {
            const statusConfig = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
            const isReady = order.status === 'ready'
            const isPickedUp = order.status === 'picked_up'
            const isReviewed = order.reviews && order.reviews.length > 0

            return (
              <div 
                key={order.id} 
                className={`bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border ${isReady ? 'border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.2)]' : 'border-slate-100 dark:border-slate-800 shadow-sm'} overflow-hidden animate-slide-up group`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Status Bar */}
            <div className={`px-4 py-3 flex items-center justify-between border-b border-border/50 text-xs sm:text-sm font-semibold`}>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusConfig.color} ${order.status === 'ready' ? 'animate-pulse' : ''}`}>
                {statusConfig.icon}
                <span>{statusConfig.label}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-border/50">
                <span className="text-[10px] uppercase tracking-wider font-bold">โต๊ะ</span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">{order.table_number}</span>
              </div>
            </div>

            <div className="p-4 sm:p-5 flex-1 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="text-lg sm:text-xl leading-tight">{order.restaurant_name}</span>
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase">#{order.id.toString().padStart(4, '0')}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10px] text-slate-400 font-medium">{new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                  </div>
                </div>
              </div>
                  <div className="space-y-2.5">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex flex-col text-xs sm:text-sm border-b border-slate-100 dark:border-slate-800/50 pb-2 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start">
                          <span className="text-slate-600 dark:text-slate-400 font-medium break-words pr-3 sm:pr-4">
                            <span className="text-primary font-bold mr-1 sm:mr-1.5">{item.quantity}x</span> 
                            {item.menu_name}
                          </span>
                          <span className="text-slate-900 dark:text-white font-medium flex-shrink-0">
                            ฿{(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                        {item.options && (
                          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 ml-4 sm:ml-5 pl-1.5 border-l-2 border-slate-200 dark:border-slate-700">
                            {item.options}
                          </span>
                        )}
                        {item.note && (
                          <span className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-500 mt-0.5 ml-4 sm:ml-5 pl-1.5 border-l-2 border-amber-200 dark:border-amber-900/50 leading-tight">
                            หมายเหตุ: {item.note}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 sm:pt-3 mt-1 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center pb-1">
                    <span className="font-bold text-slate-500 dark:text-slate-400 text-xs sm:text-sm">ยอดสุทธิ</span>
                    <span className="text-primary font-extrabold text-base sm:text-lg">฿{order.total.toLocaleString()}</span>
                  </div>

                  {/* Review Button Array */}
                  {isPickedUp && !isReviewed && (
                    <div className="pt-3">
                      <Button 
                        onClick={() => { setReviewOrder(order); setRating(5); setComment(''); }}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm text-sm"
                      >
                        <Star className="w-4 h-4 mr-1.5 fill-current" /> ให้คะแนนสั่งอาหารมื้อนี้
                      </Button>
                    </div>
                  )}
                  {isPickedUp && isReviewed && (
                    <div className="pt-3 text-center text-amber-500 text-xs font-bold flex items-center justify-center gap-1 bg-amber-50 dark:bg-amber-900/10 py-2 rounded-xl">
                      <Star className="w-3.5 h-3.5 fill-current" /> คุณรีวิวออเดอร์นี้แล้ว ขอบคุณครับ!
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {orders.length > 0 && (
        <Link href="/restaurants" className="block pt-2 pb-6 sm:pb-8 outline-none">
          <Button variant="outline" className="w-full rounded-full h-11 sm:h-12 text-sm sm:text-base font-bold border-2 border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all active:scale-95">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" /> สั่งอาหารร้านอื่นเพิ่ม
          </Button>
        </Link>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewOrder} onOpenChange={(open) => !open && setReviewOrder(null)}>
        <DialogContent className="rounded-3xl p-6 sm:p-8 max-w-sm w-[90vw] block">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-2">มื้อนี้อร่อยไหม?</DialogTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ให้คะแนนร้าน <strong>{reviewOrder?.restaurant_name}</strong>
            </p>
          </DialogHeader>
          
          <div className="py-6 flex flex-col items-center gap-5">
            {/* Star Selector */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="outline-none focus:scale-110 transition-transform active:scale-95"
                >
                  <Star 
                    className={`w-10 h-10 sm:w-12 sm:h-12 ${rating >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700 fill-slate-200 dark:fill-slate-700'} transition-colors duration-200`} 
                  />
                </button>
              ))}
            </div>

            {/* Comment Area */}
            <Textarea 
              placeholder="พิมพ์คำติชมให้ร้านค้า (ไม่บังคับ)"
              className="resize-none rounded-2xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-amber-500/30 w-full"
              rows={3}
              value={comment}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
            />
          </div>

          <DialogFooter className="sm:justify-center">
            <Button 
              onClick={handleSubmitReview}
              disabled={submittingReview}
              className="w-full rounded-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold text-base shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              {submittingReview ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'ส่งรีวิว'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
