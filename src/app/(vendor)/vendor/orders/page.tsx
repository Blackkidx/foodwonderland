'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Order, OrderItem } from '@/types'
import { BellRing, Check, Clock, CreditCard, ChefHat, PackageCheck, XCircle, Receipt, X, Info, Printer } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; badge: string; icon: React.ReactNode }> = {
  pending:   { label: 'รอชำระเงิน', color: 'border-yellow-200 dark:border-yellow-900/50', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400', icon: <Clock className="w-4 h-4" /> },
  paid:      { label: 'ชำระแล้ว', color: 'border-blue-200 dark:border-blue-900/50', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400', icon: <CreditCard className="w-4 h-4" /> },
  cooking:   { label: 'กำลังทำ', color: 'border-orange-200 dark:border-orange-900/50', badge: 'bg-primary/10 text-primary dark:bg-primary/20', icon: <ChefHat className="w-4 h-4" /> },
  ready:     { label: 'เสร็จแล้ว', color: 'border-green-200 dark:border-green-900/50', badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400', icon: <Check className="w-4 h-4" /> },
  picked_up: { label: 'รับแล้ว', color: 'border-slate-200 dark:border-slate-800', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: <PackageCheck className="w-4 h-4" /> },
  cancelled: { label: 'ยกเลิก', color: 'border-red-200 dark:border-red-900/50', badge: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400', icon: <XCircle className="w-4 h-4" /> },
}

interface OrderWithItems extends Order {
  order_items: OrderItem[]
  slip_url?: string
}

export default function VendorOrdersPage() {
  const [restaurantId, setRestaurantId] = useState<number | null>(null)
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [slipUrl, setSlipUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: assignment } = await supabase
        .from('vendor_assignments')
        .select('restaurant_id')
        .eq('vendor_id', user.id)
        .single()

      if (!assignment) return
      const resId = assignment.restaurant_id
      setRestaurantId(resId)
      await fetchOrders(resId)

      // ⚡ Realtime subscription
      const channel = supabase
        .channel('vendor-orders')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${resId}`,
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            fetchOrders(resId)
            playNotification()
            toast('ออเดอร์ใหม่เข้ามาแล้ว!', {
              icon: <BellRing className="w-5 h-5 text-primary animate-bounce" />,
              duration: 5000,
            })
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new as any } : o))
          }
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [])

  const fetchOrders = async (resId: number) => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), payments(slip_url)')
      .eq('restaurant_id', resId)
      .order('created_at', { ascending: false })

    if (data) {
      setOrders(data.map((o: any) => ({
        ...o,
        slip_url: o.payments?.[0]?.slip_url ?? null,
      })))
    }
    setLoading(false)
  }

  const playNotification = () => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch {}
  }

  const updateStatus = async (orderId: number, newStatus: string) => {
    // Optimistic Update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o))
    
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (error) {
      toast.error('อัปเดตสถานะไม่สำเร็จ')
      // Revert if error
      fetchOrders(restaurantId!)
    } else {
      toast.success('อัปเดตสถานะแล้ว')
    }
  }

  const handlePrintSlip = (order: OrderWithItems) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const date = new Date(order.created_at).toLocaleString('th-TH')
    const totalLabel = order.total.toLocaleString()
    
    // HTML/CSS specifically targeted for 58mm or 80mm thermal receipt printers.
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order #${order.id} Slip</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700&display=swap');
            body {
              font-family: 'Kanit', sans-serif;
              padding: 0;
              margin: 0;
              width: 100%;
              text-align: center;
              color: black;
              background: white;
            }
            .ticket {
              width: 80mm;
              max-width: 100%;
              margin: 0 auto;
              padding: 5mm;
              text-align: left;
              font-size: 14px;
            }
            h1, h2, h3, h4, p {
              margin: 0;
              padding: 0;
            }
            .center {
              text-align: center;
            }
            .bold {
              font-weight: 700;
            }
            .line {
              border-bottom: 1px dashed black;
              margin: 8px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 4px 0;
              vertical-align: top;
            }
            th {
              border-bottom: 1px solid black;
              text-align: left;
            }
            .qty { width: 15%; text-align: center; }
            .item { width: 55%; }
            .price { width: 30%; text-align: right; }
            .total-row td {
              padding-top: 8px;
              font-size: 18px;
              font-weight: bold;
            }
            .note {
              font-size: 12px;
              color: #333;
            }
            @media print {
              body { width: 80mm; }
              @page { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <h2 class="center bold pb-2">FoodWonderland</h2>
            <div class="center" style="font-size: 12px; margin-bottom: 10px;">ใบสั่งอาหาร / ใบเสร็จรับเงิน</div>
            
            <table style="margin-bottom: 10px;">
              <tr>
                <td><b>ออเดอร์:</b> #${order.id}</td>
                <td style="text-align:right;"><b>โต๊ะ:</b> <span style="font-size:18px;">${order.table_number}</span></td>
              </tr>
              <tr>
                <td colspan="2"><b>ลูกค้า:</b> ${order.customer_name}</td>
              </tr>
              <tr>
                <td colspan="2"><b>เวลา:</b> ${date}</td>
              </tr>
            </table>

            <div class="line"></div>

            <table>
              <thead>
                <tr>
                  <th class="qty">จน.</th>
                  <th class="item">รายการ</th>
                  <th class="price">รวม</th>
                </tr>
              </thead>
              <tbody>
                ${order.order_items.map(item => `
                  <tr>
                    <td class="qty bold">${item.quantity}</td>
                    <td class="item">
                      ${item.menu_name}
                      ${item.options ? `<div class="note">- ${item.options}</div>` : ''}
                      ${item.note ? `<div class="note">*** ${item.note}</div>` : ''}
                    </td>
                    <td class="price">฿${(item.price * item.quantity).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="line"></div>

            <table>
              <tr class="total-row">
                <td colspan="2">ยอดรวมสุทธิ</td>
                <td class="price">฿${totalLabel}</td>
              </tr>
              <tr>
                <td colspan="3" style="text-align:right; font-size:12px; padding-top:4px;">
                  สถานะ: ${order.status === 'pending' ? 'รอชำระเงิน' : 'ชำระเงินเรียบร้อย'}
                </td>
              </tr>
            </table>

            <div class="line"></div>
            <div class="center" style="margin-top:20px; font-size:14px; font-weight:bold;">
              --- ขอบคุณที่ใช้บริการ ---
            </div>
            <div class="center" style="margin-top:20px;">
              <button onclick="window.print()" style="padding: 10px 20px; background: black; color: white; border: none; border-radius: 5px; cursor: pointer; display: inline-block;">พิมพ์ใบเสร็จ</button>
              <style>@media print { button { display: none !important; } }</style>
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const statusTabs: { value: string; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'ทั้งหมด', icon: <Clock className="w-4 h-4" /> },
    { value: 'pending', label: 'รอชำระ', icon: <Receipt className="w-4 h-4" /> },
    { value: 'paid', label: 'ชำระแล้ว', icon: <CreditCard className="w-4 h-4" /> },
    { value: 'cooking', label: 'กำลังทำ', icon: <ChefHat className="w-4 h-4" /> },
    { value: 'ready', label: 'เสร็จแล้ว', icon: <Check className="w-4 h-4" /> },
  ]

  const renderOrders = (filterStatus?: string) => {
    const filtered = filterStatus && filterStatus !== 'all'
      ? orders.filter(o => o.status === filterStatus)
      : orders

    if (filtered.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4 animate-fade-in w-full col-span-full">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600">
            <Info className="w-10 h-10" />
          </div>
          <p className="text-lg font-medium text-slate-500">ไม่มีออเดอร์ในสถานะนี้</p>
        </div>
      )
    }

    return filtered.map((order, index) => {
      const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
      return (
        <div 
          key={order.id} 
          className={`bg-white dark:bg-slate-900 rounded-2xl border ${cfg.color} shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col h-full animate-slide-up`}
          style={{ animationDelay: `${index * 30}ms` }}
        >
          {/* Status Bar */}
          <div className={`px-5 py-3 flex items-center justify-between border-b border-border/50 text-sm font-semibold`}>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${cfg.badge}`}>
              {cfg.icon}
              <span>{cfg.label}</span>
            </div>
            <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
              #{order.id.toString().slice(0, 8)}
            </span>
          </div>

          {/* Details */}
          <div className="px-5 py-4 space-y-4 flex-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ลูกค้า</p>
                <p className="font-extrabold text-slate-800 dark:text-slate-100 text-lg">{order.customer_name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">โต๊ะ</p>
                <div className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm shadow-primary/30">
                  {order.table_number}
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex flex-col text-sm border-b border-slate-100 dark:border-slate-800/50 pb-2 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-600 dark:text-slate-300 font-medium break-words pr-3">
                      <span className="text-primary font-bold mr-1.5">{item.quantity}x</span>
                      {item.menu_name}
                    </span>
                    <span className="text-slate-900 dark:text-white font-semibold flex-shrink-0">
                      ฿{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                  {item.options && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 ml-5 pl-1.5 border-l-2 border-slate-200 dark:border-slate-700">
                      {item.options}
                    </span>
                  )}
                  {item.note && (
                    <span className="text-xs text-amber-600 dark:text-amber-500 mt-0.5 ml-5 pl-1.5 border-l-2 border-amber-200 dark:border-amber-900/50 leading-tight">
                      หมายเหตุ: {item.note}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm">
              <span className="font-bold text-slate-500">รวมสุทธิ</span>
              <span className="text-primary font-extrabold text-xl">฿{order.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 py-4 bg-slate-50/80 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2.5 mt-auto relative z-10">
            <Button size="sm" variant="outline" onClick={() => handlePrintSlip(order)} className="rounded-full shadow-sm hover:border-primary hover:text-primary transition-colors border-slate-200 dark:border-slate-700 font-bold">
              <Printer className="w-4 h-4 mr-1.5 text-slate-500" /> พิมพ์สลิป
            </Button>
            {order.slip_url && order.slip_url !== 'AUTO_PROMPTPAY' && (
              <Button size="sm" variant="outline" onClick={() => setSlipUrl(order.slip_url!)} className="rounded-full shadow-sm hover:border-primary hover:text-primary transition-colors border-slate-200 dark:border-slate-700 font-bold">
                <Receipt className="w-4 h-4 mr-1.5 text-slate-500" /> โอนปกติ (ดูสลิป)
              </Button>
            )}
            {order.status === 'pending' && (
              <>
                <Button size="sm" variant="destructive" className="rounded-full shadow-sm" onClick={() => updateStatus(order.id, 'cancelled')}>
                  <X className="w-4 h-4 mr-1.5" /> ยกเลิกออเดอร์
                </Button>
              </>
            )}
            {order.status === 'paid' && (
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-md hover:shadow-lg transition-all" onClick={() => updateStatus(order.id, 'cooking')}>
                <ChefHat className="w-4 h-4 mr-1.5" /> เริ่มทำอาหาร
              </Button>
            )}
            {order.status === 'cooking' && (
              <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-md hover:shadow-lg transition-all" onClick={() => updateStatus(order.id, 'ready')}>
                <Check className="w-4 h-4 mr-1.5" /> อาหารเสร็จแล้ว
              </Button>
            )}
            {order.status === 'ready' && (
              <Button size="sm" variant="outline" className="rounded-full shadow-sm border-2 border-slate-200 dark:border-slate-700" onClick={() => updateStatus(order.id, 'picked_up')}>
                <PackageCheck className="w-4 h-4 mr-1.5" /> ลูกค้ารับแล้ว
              </Button>
            )}
          </div>
        </div>
      )
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-12 w-full max-w-2xl rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          จัดการออเดอร์
          <div className="bg-primary/20 text-primary px-3 py-1 text-sm rounded-full flex items-center gap-1.5 animate-pulse">
            <div className="w-2 h-2 bg-primary rounded-full"></div> Realtime ⚡
          </div>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">อัปเดตสถานะออเดอร์ทั้งหมดได้ที่นี่</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6 bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-2xl overflow-x-auto flex-nowrap hide-scrollbar max-w-full justify-start md:justify-center">
          {statusTabs.map(t => (
            <TabsTrigger 
              key={t.value} 
              value={t.value} 
              className="rounded-xl px-4 py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all whitespace-nowrap"
            >
              <div className="flex items-center gap-2">
                {t.icon}
                {t.label}
              </div>
            </TabsTrigger>
          ))}
        </TabsList>
        
        {statusTabs.map(t => (
          <TabsContent key={t.value} value={t.value} className="focus:outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6 items-stretch">
              {renderOrders(t.value)}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Slip Modal */}
      <Dialog open={!!slipUrl} onOpenChange={() => setSlipUrl(null)}>
        <DialogContent className="max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-none shadow-2xl rounded-3xl overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b border-border/50 bg-slate-50/50 dark:bg-slate-800/50">
            <DialogTitle className="text-xl font-extrabold">สลิปการโอนเงิน</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            {slipUrl && (
              <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-inner bg-slate-50 flex items-center justify-center">
                <img src={slipUrl} alt="Slip" className="w-full object-contain max-h-[60vh]" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
