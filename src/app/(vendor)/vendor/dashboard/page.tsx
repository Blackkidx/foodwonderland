'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ShoppingBag, Banknote, Clock, CheckCircle, TrendingUp, ChefHat, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts'
import { toast } from 'sonner'

interface Stats {
  todayRevenue: number
  todayOrders: number
  monthRevenue: number
  pendingOrders: number
  cookingOrders: number
  readyOrders: number
}

// Custom Tooltip for Recharts to match 2026 UI
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-xl">
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{`วันที่ ${label}`}</p>
        <p className="text-xl font-extrabold text-primary">
          {`฿${payload[0].value.toLocaleString()}`}
        </p>
      </div>
    )
  }
  return null
}

export default function VendorDashboardPage() {
  const [restaurantId, setRestaurantId] = useState<number | null>(null)
  const [restaurantName, setRestaurantName] = useState('')
  const [isOpen, setIsOpen] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [topMenus, setTopMenus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    async function init() {
      const supabase = supabaseRef.current
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get vendor's restaurant
      const { data: assignment } = await supabase
        .from('vendor_assignments')
        .select('restaurant_id, restaurants(name, is_active)')
        .eq('vendor_id', user.id)
        .single()

      if (!assignment) { setLoading(false); return }
      const resId = assignment.restaurant_id
      const resName = (assignment as any).restaurants?.name ?? ''
      const resIsActive = (assignment as any).restaurants?.is_active ?? true
      setRestaurantId(resId)
      setRestaurantName(resName)
      setIsOpen(resIsActive)

      const today = new Date().toISOString().split('T')[0]
      const monthStart = today.slice(0, 7) + '-01'

      // Fetch orders stats
      const { data: allOrders } = await supabase
        .from('orders')
        .select('total, status, created_at')
        .eq('restaurant_id', resId)

      if (allOrders) {
        const todayOrders = allOrders.filter((o) => o.created_at.startsWith(today))
        const monthOrders = allOrders.filter((o) => o.created_at >= monthStart)
        const paidStatuses = ['paid', 'cooking', 'ready', 'picked_up']

        setStats({
          todayRevenue: todayOrders.filter(o => paidStatuses.includes(o.status)).reduce((s, o) => s + o.total, 0),
          todayOrders: todayOrders.length,
          monthRevenue: monthOrders.filter(o => paidStatuses.includes(o.status)).reduce((s, o) => s + o.total, 0),
          pendingOrders: allOrders.filter(o => o.status === 'pending').length,
          cookingOrders: allOrders.filter(o => o.status === 'cooking').length,
          readyOrders: allOrders.filter(o => o.status === 'ready').length,
        })

        // Chart: last 7 days
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (6 - i))
          return d.toISOString().split('T')[0]
        })
        setChartData(days.map((date) => ({
          date: date.slice(5),
          revenue: allOrders
            .filter(o => o.created_at.startsWith(date) && paidStatuses.includes(o.status))
            .reduce((s, o) => s + o.total, 0),
        })))
      }

      // Top menus
      const { data: items } = await supabase
        .from('order_items')
        .select('menu_name, quantity, orders!inner(restaurant_id)')
        .eq('orders.restaurant_id', resId)

      if (items) {
        const totals: Record<string, number> = {}
        items.forEach((item: any) => {
          totals[item.menu_name] = (totals[item.menu_name] ?? 0) + item.quantity
        })
        setTopMenus(
          Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, qty]) => ({ name, qty }))
        )
      }

      setLoading(false)
    }
    init()
  }, [])

  // ── Toggle open / close restaurant ──────────────────────────────────────
  const handleToggle = async () => {
    if (!restaurantId) return
    setToggling(true)
    const newState = !isOpen
    const { error } = await supabaseRef.current
      .from('restaurants')
      .update({ is_active: newState })
      .eq('id', restaurantId)
    if (error) {
      toast.error('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง')
    } else {
      setIsOpen(newState)
      toast.success(newState ? '✅ เปิดรับออเดอร์แล้ว — ลูกค้าเห็นร้านของคุณแล้ว!' : '🔒 ปิดรับออเดอร์แล้ว — ลูกค้าจะเห็นว่าร้านปิด', { duration: 3000 })
    }
    setToggling(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6">
          <Skeleton className="lg:col-span-2 h-80 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{restaurantName}</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm sm:text-base">ภาพรวมร้านค้าและยอดขายวันนี้</p>
        </div>
        {/* ── Open / Close Toggle ──────────────────── */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-bold text-sm sm:text-base shadow-md transition-all active:scale-95 ${
            isOpen
              ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-200 dark:shadow-green-900/30'
              : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 shadow-slate-200 dark:shadow-slate-900'
          } disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {toggling ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isOpen ? (
            <ToggleRight className="w-5 h-5" />
          ) : (
            <ToggleLeft className="w-5 h-5" />
          )}
          <span>{toggling ? 'กำลังอัปเดต...' : isOpen ? '🟢 เปิดรับออเดอร์' : '🔴 ปิดรับออเดอร์'}</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        {[
          { label: 'ยอดขายวันนี้', value: `฿${stats?.todayRevenue.toLocaleString()}`, icon: Banknote, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'ออเดอร์วันนี้ (รายการ)', value: stats?.todayOrders, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'กำลังทำอาหาร / รอมารับ', value: (stats?.cookingOrders ?? 0) + (stats?.readyOrders ?? 0), icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'ยอดขายสุทธิ (เดือนนี้)', value: `฿${stats?.monthRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
        ].map((stat, i) => (
          <Card key={i} className="rounded-3xl border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{stat.label}</p>
                <div className={`w-10 h-10 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2 rounded-3xl border-slate-100 dark:border-slate-800 shadow-sm animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-lg font-extrabold text-slate-900 dark:text-white">ยอดขายย้อนหลัง 7 วัน</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(v) => `฿${v}`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.4 }} />
                <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 6, fill: '#ea580c', stroke: '#fff', strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Menus */}
        <Card className="rounded-3xl border-slate-100 dark:border-slate-800 shadow-sm animate-slide-up flex flex-col" style={{ animationDelay: '250ms' }}>
          <CardHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/50">
            <CardTitle className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              เมนูยอดฮิต 5 อันดับแรก
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-center">
            {topMenus.length === 0 ? (
              <div className="text-center py-10 opacity-70">
                <ChefHat className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm font-medium">ยังไม่มีข้อมูลยอดขายเมนู</p>
              </div>
            ) : (
              <div className="space-y-5">
                {topMenus.map((item, i) => {
                  const percent = ((item.qty / topMenus[0].qty) * 100)
                  return (
                    <div key={item.name} className="flex relative items-center gap-4 group">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-sm group-hover:bg-primary group-hover:text-white transition-colors">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate pr-2">{item.name}</span>
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md whitespace-nowrap">{item.qty} จาน</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-orange-400 to-primary h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
