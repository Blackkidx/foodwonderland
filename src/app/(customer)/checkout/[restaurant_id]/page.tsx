'use client'

import { createClient } from '@/lib/supabase/client'
import { use, useEffect, useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle, Loader2, RefreshCw, Clock, AlertTriangle, User } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { Restaurant } from '@/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const QR_EXPIRY_SECONDS = 15 * 60 // 15 minutes

export default function CheckoutPage({ params }: { params: Promise<{ restaurant_id: string }> }) {
  const { restaurant_id } = use(params)
  const restaurantId = parseInt(restaurant_id)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  
  const [step, setStep] = useState<'review' | 'paying' | 'expired' | 'success'>('review')
  const [submitting, setSubmitting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [qrCodeUri, setQrCodeUri] = useState<string | null>(null)
  const [chargeId, setChargeId] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<number | null>(null)
  
  // QR countdown timer
  const [secondsLeft, setSecondsLeft] = useState(QR_EXPIRY_SECONDS)
  
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const { cart, tableNumber, clearRestaurant, getRestaurantTotal, sessionToken } = useCartStore()
  const [customerName, setCustomerName] = useState('')

  const group = cart.find((r) => r.restaurantId === restaurantId)
  const total = getRestaurantTotal(restaurantId)
  
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)
  const countdownInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    supabaseRef.current.from('restaurants').select('*').eq('id', restaurantId).single().then(({ data }) => {
      if (data) setRestaurant(data)
      setLoading(false)
    })

    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current)
      if (countdownInterval.current) clearInterval(countdownInterval.current)
    }
  }, [restaurantId])

  // ── Countdown timer ────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    setSecondsLeft(QR_EXPIRY_SECONDS)
    if (countdownInterval.current) clearInterval(countdownInterval.current)
    countdownInterval.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval.current!)
          if (pollingInterval.current) clearInterval(pollingInterval.current)
          setStep('expired')
          toast.warning('QR Code หมดอายุแล้ว กรุณาสร้างใหม่', { icon: '⏰' })
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  // ── Payment polling ────────────────────────────────────────────
  const startPolling = useCallback((charge_id: string, order_id: number) => {
    if (pollingInterval.current) clearInterval(pollingInterval.current)
    pollingInterval.current = setInterval(async () => {
      try {
        const res = await fetch('/api/payment/check-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ charge_id, order_id })
        })
        const data = await res.json()
        
        if (data.status === 'successful') {
          if (pollingInterval.current) clearInterval(pollingInterval.current)
          if (countdownInterval.current) clearInterval(countdownInterval.current)
          setStep('success')
          clearRestaurant(restaurantId)
          toast.success('ชำระเงินสำเร็จ! กำลังส่งออเดอร์ไปที่ครัว 🎉')
          setTimeout(() => { router.push('/orders') }, 3000)
        }
      } catch (err) {
        console.error('Polling error', err)
      }
    }, 3000)
  }, [restaurantId, clearRestaurant, router])

  // ── Create order + QR ──────────────────────────────────────────
  const handleCreateOrder = async () => {
    if (!group || !tableNumber || !customerName.trim()) return
    setSubmitting(true)

    try {
      const supabase = supabaseRef.current

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          session_id: null,
          session_token: sessionToken,
          restaurant_id: restaurantId,
          customer_name: customerName.trim(),
          table_number: tableNumber,
          total,
          status: 'pending',
        })
        .select('id')
        .single()
      if (orderErr) throw orderErr

      const items = group.items.map((item) => ({
        order_id: order.id,
        menu_id: item.menuId,
        menu_name: item.menuName,
        quantity: item.quantity,
        price: item.price,
        options: item.optionsText || null,
        note: item.noteText || null,
      }))
      await supabase.from('order_items').insert(items)

      for (const item of group.items) {
        await supabase.rpc('decrement_stock', { menu_id: item.menuId, qty: item.quantity })
      }

      const omiseRes = await fetch('/api/payment/create-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id })
      })

      const omiseData = await omiseRes.json()
      if (!omiseRes.ok) throw new Error(omiseData.error || 'Failed to generate QR')

      setQrCodeUri(omiseData.qr_code_uri)
      setChargeId(omiseData.charge_id)
      setOrderId(order.id)
      setStep('paying')
      startCountdown()
      startPolling(omiseData.charge_id, order.id)

    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Regenerate QR only (order already exists) ─────────────────
  const handleRegenerateQR = async () => {
    if (!orderId) return
    setRegenerating(true)
    setQrCodeUri(null)

    try {
      const omiseRes = await fetch('/api/payment/create-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId })
      })

      const omiseData = await omiseRes.json()
      if (!omiseRes.ok) throw new Error(omiseData.error || 'Failed to regenerate QR')

      setQrCodeUri(omiseData.qr_code_uri)
      setChargeId(omiseData.charge_id)
      setStep('paying')
      startCountdown()
      startPolling(omiseData.charge_id, orderId)
      toast.success('สร้าง QR Code ใหม่สำเร็จ!')

    } catch (err: any) {
      toast.error('สร้าง QR ใหม่ไม่สำเร็จ', { description: err.message })
    } finally {
      setRegenerating(false)
    }
  }

  // ── Timer display helpers ─────────────────────────────────────
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const timerText = `${minutes}:${seconds.toString().padStart(2, '0')}`
  const timerPercent = (secondsLeft / QR_EXPIRY_SECONDS) * 100
  const timerColor =
    secondsLeft > 300 ? 'text-green-500' :
    secondsLeft > 60  ? 'text-amber-500' :
    'text-red-500'
  const ringColor =
    secondsLeft > 300 ? 'stroke-green-500' :
    secondsLeft > 60  ? 'stroke-amber-500' :
    'stroke-red-500'

  if (loading || !group) {
    return <Skeleton className="h-64 w-full rounded-2xl sm:rounded-3xl mt-4" />
  }

  return (
    <div className="space-y-4 sm:space-y-6 py-2 sm:py-4 animate-fade-in max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        {step === 'review' ? (
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 w-9 h-9 sm:w-10 sm:h-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
        ) : (
          <div className="w-9 h-9 sm:w-10 sm:h-10" />
        )}
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">ชำระเงิน</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{restaurant?.name}</p>
        </div>
      </div>

      {/* ── REVIEW ───────────────────────────────────────────────── */}
      {step === 'review' && (
        <>
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-2">
            <h2 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm sm:text-base">สรุปรายการที่สั่ง</h2>
            {group.items.map((item) => (
              <div key={item.id} className="text-xs sm:text-sm py-1">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400 font-bold">{item.menuName} x{item.quantity}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">฿{(item.price * item.quantity).toFixed(0)}</span>
                </div>
                {item.optionsText && <p className="text-slate-500 text-xs mt-0.5">{item.optionsText}</p>}
                {item.noteText && <p className="text-amber-600 text-xs mt-0.5 leading-tight">หมายเหตุ: {item.noteText}</p>}
              </div>
            ))}
            <div className="pt-2 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between font-bold">
              <span className="text-slate-700 dark:text-slate-300">รวมยอดชำระ</span>
              <span className="text-primary text-lg sm:text-xl">฿{total.toFixed(0)}</span>
            </div>
          </div>

          {/* Customer Name Input */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 sm:p-5">
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2 text-sm sm:text-base">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                ชื่อสำหรับเรียกรับอาหาร <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น น้องบิ๊ก, เจ้สุ, โต๊ะ 2"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="w-full h-11 sm:h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:font-normal placeholder:text-slate-400"
            />
            <p className="text-xs text-slate-400 mt-1.5">ร้านอาหารจะเรียกชื่อนี้เมื่ออาหารพร้อม</p>
          </div>

          <Button
            onClick={handleCreateOrder}
            disabled={submitting || !customerName.trim()}
            className="w-full h-11 sm:h-12 text-sm sm:text-base bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-full font-bold active:scale-95 transition-all"
          >
            {submitting ? <><Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" /> กำลังสร้าง QR Code...</> : `ชำระเงิน ฿${total.toFixed(0)}`}
          </Button>
        </>
      )}

      {/* ── PAYING ───────────────────────────────────────────────── */}
      {step === 'paying' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 sm:p-8 text-center space-y-4 sm:space-y-5 animate-in fade-in duration-500">
          <h2 className="font-extrabold text-slate-800 dark:text-white text-base sm:text-lg">สแกนเพื่อจ่ายเงิน (PromptPay)</h2>

          {/* QR Code */}
          <div className="bg-slate-50 dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-700 relative max-w-[260px] mx-auto">
            {qrCodeUri ? (
              <img src={qrCodeUri} alt="PromptPay QR" className="w-full h-auto object-contain rounded-xl" />
            ) : (
              <Skeleton className="w-full h-56 rounded-xl" />
            )}
          </div>

          {/* Countdown Ring + Timer */}
          <div className="flex flex-col items-center gap-1">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
                {/* Background ring */}
                <circle cx="36" cy="36" r="30" fill="none" stroke="currentColor" strokeWidth="5" className="text-slate-100 dark:text-slate-800" />
                {/* Progress ring */}
                <circle
                  cx="36" cy="36" r="30"
                  fill="none"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 30}`}
                  strokeDashoffset={`${2 * Math.PI * 30 * (1 - timerPercent / 100)}`}
                  className={`${ringColor} transition-all duration-1000`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Clock className={`w-4 h-4 ${timerColor} mb-0.5`} />
                <span className={`text-sm font-extrabold ${timerColor} leading-none`}>{timerText}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">QR หมดอายุใน {timerText} นาที</p>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">ยอดชำระของคุณคือ <span className="font-bold text-primary text-base sm:text-lg">฿{total.toFixed(0)}</span></p>

          <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            กำลังรอตรวจสอบการชำระเงิน...
          </div>
          <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">กรุณาอย่าปิดหน้านี้จนกว่าจะชำระเงินสำเร็จ</p>
        </div>
      )}

      {/* ── EXPIRED ──────────────────────────────────────────────── */}
      {step === 'expired' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-amber-200 dark:border-amber-900/40 shadow-sm p-6 sm:p-8 text-center space-y-4 sm:space-y-5 animate-in fade-in duration-500">
          {/* Expired Icon */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500" />
          </div>

          <div>
            <h2 className="font-extrabold text-slate-800 dark:text-white text-lg sm:text-xl">QR Code หมดอายุแล้ว</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
              QR Code มีอายุ 15 นาที<br />
              กดปุ่มด้านล่างเพื่อสร้าง QR ใหม่<br />
              <span className="text-amber-600 dark:text-amber-400 font-medium">ออเดอร์ของคุณยังคงอยู่ ไม่ต้องสั่งใหม่</span>
            </p>
          </div>

          {/* Order summary reminder */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-left space-y-1">
            {group.items.map((item) => (
              <div key={item.id} className="text-xs sm:text-sm py-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400 font-bold">{item.menuName} x{item.quantity}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">฿{(item.price * item.quantity).toFixed(0)}</span>
                </div>
                {item.optionsText && <p className="text-slate-500 text-[10px] sm:text-xs mt-0.5">{item.optionsText}</p>}
                {item.noteText && <p className="text-amber-600 text-[10px] sm:text-xs mt-0.5 leading-tight">หมายเหตุ: {item.noteText}</p>}
              </div>
            ))}
            <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-xs sm:text-sm mt-1">
              <span className="text-slate-700 dark:text-slate-300">รวม</span>
              <span className="text-primary">฿{total.toFixed(0)}</span>
            </div>
          </div>

          <Button
            onClick={handleRegenerateQR}
            disabled={regenerating}
            className="w-full h-11 sm:h-12 text-sm sm:text-base bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-full font-bold active:scale-95 transition-all"
          >
            {regenerating
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> กำลังสร้าง QR ใหม่...</>
              : <><RefreshCw className="w-4 h-4 mr-2" /> สร้าง QR Code ใหม่</>
            }
          </Button>
        </div>
      )}

      {/* ── SUCCESS ──────────────────────────────────────────────── */}
      {step === 'success' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-green-200 dark:border-green-900/40 shadow-sm p-6 sm:p-8 text-center space-y-3 sm:space-y-4 animate-in zoom-in duration-300">
          <CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 text-green-500 mx-auto" />
          <h2 className="font-extrabold text-slate-800 dark:text-white text-xl sm:text-2xl">ชำระเงินสำเร็จ!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">ออเดอร์ของคุณถูกส่งไปที่ครัวแล้ว<br/>กำลังพากลับไปหน้าติดตามอาหาร...</p>
        </div>
      )}
    </div>
  )
}
