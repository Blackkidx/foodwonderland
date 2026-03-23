'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from 'recharts'
import { ShoppingBag, Banknote, Users, Table2, Store, Activity, TrendingUp } from 'lucide-react'

interface DashboardStats {
  totalOrders: number
  totalRevenue: number
  vendorCount: number
  restaurantCount: number
  tableCount: number
  activeSessions: number
}

interface RestaurantRevenue {
  name: string
  revenue: number
  orders: number
}

// Premium color palette for charts specifically
const CHART_COLORS = ['#f97316', '#ef4444', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b']

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [chartData, setChartData] = useState<RestaurantRevenue[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchAll() {
      const [
        { data: orders },
        { count: vendorCount },
        { count: restaurantCount },
        { count: tableCount },
        { count: activeSessions },
        { data: restaurants },
      ] = await Promise.all([
        supabase.from('orders').select('total, status, restaurant_id'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'vendor'),
        supabase.from('restaurants').select('*', { count: 'exact', head: true }),
        supabase.from('tables').select('*', { count: 'exact', head: true }),
        supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('restaurants').select('id, name'),
      ])

      const paidStatuses = ['paid', 'cooking', 'ready', 'picked_up']
      const paidOrders = (orders ?? []).filter(o => paidStatuses.includes(o.status))
      const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.total), 0)

      setStats({
        totalOrders: orders?.length ?? 0,
        totalRevenue,
        vendorCount: vendorCount ?? 0,
        restaurantCount: restaurantCount ?? 0,
        tableCount: tableCount ?? 0,
        activeSessions: activeSessions ?? 0,
      })

      // Revenue per restaurant
      if (restaurants && orders) {
        const chart = restaurants.map((r) => {
          const restOrders = orders.filter(o => o.restaurant_id === r.id)
          const rev = restOrders
            .filter(o => paidStatuses.includes(o.status))
            .reduce((s, o) => s + Number(o.total), 0)
          return { name: r.name, revenue: rev, orders: restOrders.length }
        }).sort((a, b) => b.revenue - a.revenue)
        setChartData(chart)
      }

      setLoading(false)
    }
    fetchAll()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 rounded-xl mb-2" />
          <Skeleton className="h-4 w-48 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] w-full rounded-3xl lg:col-span-2" />
          <Skeleton className="h-[400px] w-full rounded-3xl" />
        </div>
      </div>
    )
  }

  const statCards = [
    { label: 'ออเดอร์ทั้งหมด', value: stats?.totalOrders.toLocaleString(), icon: ShoppingBag, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
    { label: 'รายได้รวม (บาท)', value: `฿${stats?.totalRevenue.toLocaleString()}`, icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'ร้านอาหารในระบบ', value: stats?.restaurantCount.toLocaleString(), icon: Store, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: 'บัญชี Vendor', value: stats?.vendorCount.toLocaleString(), icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    { label: 'จำนวนโต๊ะทั้งหมด', value: stats?.tableCount.toLocaleString(), icon: Table2, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: 'เซสชันรอสั่งอาหาร', value: stats?.activeSessions.toLocaleString(), icon: Activity, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">System Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">ภาพรวมและข้อมูลเชิงลึกของระบบ FoodWonderland ทั้งหมด</p>
        </div>
      </div>

      {/* Premium Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <div 
              key={card.label} 
              className={`bg-white dark:bg-slate-900 rounded-3xl p-6 border ${card.border} shadow-sm relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-slide-up`}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {/* Decorative background element */}
              <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${card.bg} blur-2xl opacity-50 group-hover:scale-150 transition-transform duration-700`} />
              
              <div className="relative z-10 flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${card.bg} border ${card.border}`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <TrendingUp className="w-5 h-5 text-slate-300 dark:text-slate-700" />
              </div>
              
              <div className="relative z-10">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{card.label}</p>
                <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{card.value}</h3>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Advanced Revenue Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8 animate-slide-up h-full" style={{ animationDelay: '300ms' }}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">ยอดขายแยกตามร้านอาหาร</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">เปรียบเทียบรายได้ที่ชำระเงินแล้วของแต่ละร้าน</p>
            </div>
          </div>

          <div className="h-[320px] w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Store className="w-12 h-12 mb-3 opacity-20" />
                <p>ยังไม่มีข้อมูลยอดขาย</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={1}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800/80" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                    angle={-25}
                    textAnchor="end"
                    dy={10}
                    interval={0}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} 
                    tickFormatter={(v) => `฿${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`}
                    dx={-10}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl shadow-xl">
                            <p className="font-bold text-white mb-2 pb-2 border-b border-slate-700/50">{payload[0].payload.name}</p>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-primary" />
                              <span className="text-slate-300 font-medium">รายได้:</span>
                              <span className="font-extrabold text-white">฿{Number(payload[0].value).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-3 h-3 rounded-full bg-slate-500" />
                              <span className="text-slate-300 font-medium">ออเดอร์:</span>
                              <span className="font-extrabold text-white">{payload[0].payload.orders} รายการ</span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="url(#colorRevenue)" 
                    radius={[8, 8, 8, 8]}
                    barSize={40}
                  >
                    {chartData.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS[index % CHART_COLORS.length]} 
                        fillOpacity={0.85}
                        className="hover:fill-opacity-100 transition-all duration-300 cursor-pointer"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Restaurant Summary Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8 animate-slide-up h-full flex flex-col" style={{ animationDelay: '400ms' }}>
          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">อันดับยอดขาย</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">จัดอันดับตามรายได้สูงสุด</p>
          </div>
          
          <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                <p>ไม่มีข้อมูลการจัดอันดับ</p>
              </div>
            ) : (
              <div className="space-y-4">
                {chartData.map((r, idx) => (
                  <div key={r.name} className="flex items-center p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all group">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-white shadow-sm flex-shrink-0"
                      style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}
                    >
                      {idx + 1}
                    </div>
                    
                    <div className="ml-4 flex-1 min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-primary transition-colors">{r.name}</p>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{r.orders} ออเดอร์</p>
                    </div>
                    
                    <div className="text-right ml-2">
                      <p className="font-extrabold text-slate-800 dark:text-white">฿{r.revenue.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
