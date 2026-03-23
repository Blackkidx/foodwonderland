'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle } from 'lucide-react'

interface StockMenu {
  id: number
  name: string
  stock: number
  low_stock_threshold: number
}

interface Alert {
  id: number
  menu_id: number
  current_stock: number
  threshold: number
  is_read: boolean
  menus: { name: string }
}

export default function VendorStockPage() {
  const [restaurantId, setRestaurantId] = useState<number | null>(null)
  const [menus, setMenus] = useState<StockMenu[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
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
      setRestaurantId(assignment.restaurant_id)
      await fetchStockAndAlerts(assignment.restaurant_id)
    }
    init()
  }, [])

  const fetchStockAndAlerts = async (resId: number) => {
    const [{ data: menuData }, { data: alertData }] = await Promise.all([
      supabase.from('menus').select('id, name, stock, low_stock_threshold').eq('restaurant_id', resId).order('id'),
      supabase.from('stock_alerts').select('id, menu_id, current_stock, threshold, is_read, menus(name)').eq('restaurant_id', resId).eq('is_read', false).order('created_at', { ascending: false })
    ])
    
    if (menuData) setMenus(menuData)
    if (alertData) setAlerts(alertData as any[])
    setLoading(false)
  }

  const handleUpdate = async (menuId: number, stock: number, threshold: number) => {
    setUpdatingId(menuId)
    const { error } = await supabase
      .from('menus')
      .update({ stock, low_stock_threshold: threshold })
      .eq('id', menuId)
    
    if (error) {
      toast.error('อัปเดตสต๊อกไม่สำเร็จ')
    } else {
      toast.success('อัปเดตสต๊อกเรียบร้อย')
      if (restaurantId) fetchStockAndAlerts(restaurantId) // refresh alerts
    }
    setUpdatingId(null)
  }

  const handleChange = (menuId: number, field: 'stock' | 'low_stock_threshold', value: number) => {
    const v = isNaN(value) ? 0 : Math.max(0, value)
    setMenus(prev => prev.map(m => m.id === menuId ? { ...m, [field]: v } : m))
  }

  const markAlertAsRead = async (alertId: number) => {
    await supabase.from('stock_alerts').update({ is_read: true }).eq('id', alertId)
    setAlerts(prev => prev.filter(a => a.id !== alertId))
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-32" /><Skeleton className="h-64 w-full" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">จัดการสต๊อกสินค้า</h1>
        <p className="text-slate-500 text-sm">อัปเดตจำนวนวัตถุดิบและตั้งค่าแจ้งเตือน</p>
      </div>

      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-red-600 font-bold">
            <AlertCircle className="w-5 h-5" />
            <h2>แจ้งเตือนของใกล้หมด ({alerts.length} รายการ)</h2>
          </div>
          <div className="space-y-2">
            {alerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between bg-white px-4 py-2 rounded-lg border border-red-100">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">{alert.menus?.name}</span> เหลือสต๊อกเพียง {alert.current_stock} (ต่ำกว่าจุดสั่งซื้อที่ {alert.threshold})
                </p>
                <Button size="sm" variant="ghost" onClick={() => markAlertAsRead(alert.id)} className="text-slate-500 hover:text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" /> รับทราบ
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b">
            <tr>
              <th className="px-4 py-3 w-1/3">ชื่อเมนู</th>
              <th className="px-4 py-3">สต๊อกปัจจุบัน</th>
              <th className="px-4 py-3">จุดแจ้งเตือน (Threshold)</th>
              <th className="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {menus.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-slate-400">ยังไม่มีเมนู</td></tr>
            ) : menus.map((menu) => {
              const isLow = menu.stock <= menu.low_stock_threshold
              return (
                <tr key={menu.id} className={`hover:bg-slate-50 transition-colors ${isLow ? 'bg-orange-50/30' : ''}`}>
                  <td className="px-4 py-3 font-medium text-slate-800 flex items-center gap-2">
                    {isLow && <AlertCircle className="w-4 h-4 text-orange-500" />}
                    {menu.name}
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      className="w-24 h-9"
                      value={menu.stock}
                      onChange={(e) => handleChange(menu.id, 'stock', parseInt(e.target.value))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      className="w-24 h-9"
                      value={menu.low_stock_threshold}
                      onChange={(e) => handleChange(menu.id, 'low_stock_threshold', parseInt(e.target.value))}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      className="bg-slate-800 hover:bg-slate-900"
                      disabled={updatingId === menu.id}
                      onClick={() => handleUpdate(menu.id, menu.stock, menu.low_stock_threshold)}
                    >
                      {updatingId === menu.id ? 'กำลังบันทึก...' : 'บันทึก'}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
