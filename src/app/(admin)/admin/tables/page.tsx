'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Trash2, QrCode, Printer, Table2, Search, Zap, Info } from 'lucide-react'

interface TableWithSession {
  id: string
  table_number: number
  qr_token: string
  is_active: boolean
}

const APP_URL = typeof window !== 'undefined'
  ? window.location.origin
  : process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

function getQRImageUrl(qrToken: string) {
  const targetUrl = `${APP_URL}/table/${qrToken}`
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(targetUrl)}`
}

export default function AdminTablesPage() {
  const [tables, setTables] = useState<TableWithSession[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [newTableNumber, setNewTableNumber] = useState('')
  const [adding, setAdding] = useState(false)
  const [qrDialog, setQrDialog] = useState<TableWithSession | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<TableWithSession | null>(null)
  const supabase = createClient()

  useEffect(() => { fetchTables() }, [])

  const fetchTables = async () => {
    const { data } = await supabase
      .from('tables')
      .select('*')
      .order('table_number')
    if (data) setTables(data as TableWithSession[])
    setLoading(false)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseInt(newTableNumber)
    if (!num || num < 1) return
    setAdding(true)
    const { error } = await supabase.from('tables').insert({ table_number: num })
    if (error) {
      toast.error('เพิ่มโต๊ะไม่สำเร็จ', { description: error.message.includes('unique') ? 'มีโต๊ะหมายเลขนี้แล้ว' : error.message })
    } else {
      toast.success(`เพิ่มโต๊ะ ${num} สำเร็จ`)
      setNewTableNumber('')
      fetchTables()
    }
    setAdding(false)
  }

  const handleDelete = async (table: TableWithSession) => {
    // Optimistic update
    setTables(prev => prev.filter(t => t.id !== table.id))
    setDeleteDialog(null)
    
    const { error } = await supabase.from('tables').delete().eq('id', table.id)
    if (error) {
      toast.error('ลบโต๊ะไม่สำเร็จ')
      fetchTables() // Revert
    } else {
      toast.success(`ลบโต๊ะ ${table.table_number} แล้ว`)
    }
  }

  const toggleActive = async (table: TableWithSession) => {
    // Optimistic update
    setTables(prev => prev.map(t => t.id === table.id ? { ...t, is_active: !t.is_active } : t))
    
    const { error } = await supabase.from('tables').update({ is_active: !table.is_active }).eq('id', table.id)
    if (error) {
      toast.error('อัปเดตสถานะไม่สำเร็จ')
      setTables(prev => prev.map(t => t.id === table.id ? { ...t, is_active: table.is_active } : t)) // Revert
    }
  }

  const handlePrint = (table: TableWithSession) => {
    const qrUrl = getQRImageUrl(table.qr_token)
    const tableUrl = `${APP_URL}/table/${table.qr_token}`
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - โต๊ะ ${table.table_number}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700;800&display=swap');
            body { font-family: 'Kanit', sans-serif; text-align: center; padding: 40px; margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: white; }
            .card { border: 3px solid #f97316; border-radius: 24px; padding: 40px 32px; display: inline-block; max-width: 400px; box-shadow: 0 10px 25px rgba(249, 115, 22, 0.15); background: white; }
            img { width: 280px; height: 280px; border-radius: 16px; margin: 16px 0; border: 1px solid #fed7aa; }
            .logo-text { color: #f97316; font-weight: 800; font-size: 18px; letter-spacing: 0.5px; margin-bottom: 8px; text-transform: uppercase; }
            h1 { font-size: 36px; margin: 16px 0 8px; color: #1e293b; font-weight: 800; }
            h1 span { color: #f97316; }
            p.instructions { color: #475569; font-size: 18px; font-weight: 600; margin-bottom: 24px; background: #fff7ed; padding: 8px 16px; border-radius: 12px; display: inline-block; }
            p.url { color: #94a3b8; font-size: 11px; word-break: break-all; margin-top: 16px; }
            @media print { 
              body { padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              button { display: none; } 
              .card { box-shadow: none; border-width: 2px; }
            }
            .print-btn { padding: 12px 32px; background: #f97316; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 32px; font-family: 'Kanit'; transition: background 0.2s; }
            .print-btn:hover { background: #ea580c; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo-text">FoodWonderland</div>
            <img src="${qrUrl}" alt="QR Code" />
            <h1>โต๊ะ <span>${table.table_number}</span></h1>
            <p class="instructions">สแกน QR เพื่อสั่งอาหาร</p>
            <p class="url">${tableUrl}</p>
          </div>
          <button class="print-btn" onclick="window.print()">พิมพ์ QR Code นี้</button>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const filteredTables = tables.filter(t => t.table_number.toString().includes(searchQuery))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-12 w-48 rounded-full" />
        </div>
        <Skeleton className="h-[500px] w-full rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Table2 className="w-8 h-8 text-sky-500" />
            จัดการโต๊ะ & QR Code
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
            <span className="font-bold text-sky-500">{tables.length}</span> โต๊ะในระบบ
          </p>
        </div>
        
        {/* Add Table Form Inline */}
        <form onSubmit={handleAdd} className="flex items-center gap-3 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <Input
              type="number"
              min={1}
              placeholder="ใส่หมายเลขโต๊ะ..."
              value={newTableNumber}
              onChange={e => setNewTableNumber(e.target.value)}
              className="pl-3 pr-4 h-11 border-none bg-slate-50 dark:bg-slate-800/50 rounded-xl focus-visible:ring-sky-500 text-base font-bold"
            />
          </div>
          <Button type="submit" disabled={adding || !newTableNumber} className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl h-11 px-5 font-bold shadow-sm hover:shadow-md transition-all active:scale-95 group">
            <Plus className="w-5 h-5 mr-1.5 group-hover:rotate-90 transition-transform" /> เพิ่มโต้ะใหม่
          </Button>
        </form>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input 
          placeholder="ค้นหาหมายเลขโต๊ะ..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-14 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm focus-visible:ring-sky-500 text-base"
        />
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-slide-up" style={{ animationDelay: '100ms' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">หมายเลขโต๊ะ</th>
                <th className="px-6 py-4">การรับลูกค้า</th>
                <th className="px-6 py-4 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredTables.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-16 text-slate-400">
                    <Table2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-base font-medium">ไม่พบข้อมูลโต๊ะ</p>
                  </td>
                </tr>
              ) : filteredTables.map((table) => (
                  <tr key={table.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 border-2 border-sky-200 dark:border-sky-800/50 flex items-center justify-center font-bold text-sky-600 dark:text-sky-400 text-lg shadow-sm">
                          {table.table_number}
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-base">โต๊ะ {table.table_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={table.is_active} 
                          onCheckedChange={() => toggleActive(table)} 
                          className="data-[state=checked]:bg-sky-500"
                        />
                        <span className={`text-xs font-bold ${table.is_active ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`}>
                          {table.is_active ? 'พร้อมใช้งาน' : 'ปิดชั่วคราว'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQrDialog(table)}
                          className="text-primary border-primary/30 hover:bg-primary/5 hover:border-primary transition-colors rounded-full font-bold px-4"
                        >
                          <QrCode className="w-4 h-4 mr-1.5" /> <span className="hidden sm:inline">ดูคิวอาร์</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrint(table)}
                          className="text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors rounded-full font-bold px-4 hidden md:flex"
                        >
                          <Printer className="w-4 h-4 mr-1.5" /> <span className="hidden sm:inline">พิมพ์</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDeleteDialog(table)}
                          className="h-9 w-9 rounded-full border-slate-200 dark:border-slate-700 hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          title="ลบโต๊ะ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Premium QR Code Dialog */}
      <Dialog open={!!qrDialog} onOpenChange={(open) => !open && setQrDialog(null)}>
        <DialogContent className="max-w-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2rem] p-0 overflow-hidden text-center">
          <div className="bg-primary/5 dark:bg-primary/10 px-6 py-8 flex flex-col items-center border-b border-primary/10">
            <h2 className="text-primary font-black uppercase tracking-widest text-xs mb-4 flex items-center gap-1.5">
              <QrCode className="w-4 h-4" /> QR Code Order
            </h2>
            
            <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-100 transform transition-transform hover:scale-105 duration-300">
              {qrDialog && (
                <img
                  src={getQRImageUrl(qrDialog.qr_token)}
                  alt="QR Code"
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl"
                />
              )}
            </div>
            
            <h3 className="mt-6 text-3xl font-black text-slate-800 dark:text-white">
              โต๊ะ <span className="text-primary">{qrDialog?.table_number}</span>
            </h3>
            <p className="text-slate-500 dark:text-slate-400 font-semibold mt-1">ลูกค้านำมือถือสแกนเพื่อสั่งอาหาร</p>
          </div>
          
          <div className="p-6 space-y-4 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <Info className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <p className="text-[10px] text-slate-500 text-left font-mono break-all leading-tight">
                {APP_URL}/table/{qrDialog?.qr_token}
              </p>
            </div>
            
            <div className="flex flex-col gap-2.5">
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg rounded-full font-bold h-12 text-base active:scale-95 transition-all"
                onClick={() => qrDialog && handlePrint(qrDialog)}
              >
                <Printer className="w-5 h-5 mr-2" /> พิมพ์ฉลากคิวอาร์โต๊ะนี้
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-full font-bold h-12 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 active:scale-95 transition-all"
                onClick={() => {
                  if (qrDialog) {
                    navigator.clipboard.writeText(`${APP_URL}/table/${qrDialog.qr_token}`)
                    toast.success('คัดลอก URL ลิงก์เรียบร้อยแล้ว')
                  }
                }}
              >
                คัดลอกลิงก์
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent className="max-w-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              ยืนยันการลบโต๊ะ
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            คุณต้องการลบ <span className="font-bold text-slate-900 dark:text-white">โต๊ะหมายเลข {deleteDialog?.table_number}</span> ออกจากระบบหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
          <DialogFooter className="flex gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(null)}
              className="flex-1 rounded-full font-bold"
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
              className="flex-1 rounded-full font-bold bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              ลบโต๊ะ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
