'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, UserX, UserCheck, Users, Search, Store, Mail, Lock, KeyRound, Edit2, Trash2, UserCog } from 'lucide-react'

interface Restaurant { id: number; name: string }
interface VendorWithRestaurant {
  id: string
  full_name: string
  created_at: string
  restaurant: { id: number; name: string } | null
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<VendorWithRestaurant[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null)
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('')
  const [vendorToDelete, setVendorToDelete] = useState<{ id: string; name: string } | null>(null)
  const [createForm, setCreateForm] = useState({ full_name: '', email: '', password: '' })
  const [editForm, setEditForm] = useState({ full_name: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  const router = useRouter()

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [{ data: profileData }, { data: restData }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, created_at').eq('role', 'vendor').order('created_at'),
      supabase.from('restaurants').select('id, name').order('id'),
    ])

    if (restData) setRestaurants(restData)

    if (profileData) {
      const { data: assignments } = await supabase
        .from('vendor_assignments')
        .select('vendor_id, restaurants(id, name)')
      
      const assignMap: Record<string, { id: number; name: string }> = {}
      if (assignments) {
        assignments.forEach((a: any) => {
          assignMap[a.vendor_id] = a.restaurants
        })
      }

      setVendors(profileData.map(p => ({
        ...p,
        restaurant: assignMap[p.id] ?? null,
      })))
    }
    setLoading(false)
  }

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/create-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(`สร้างบัญชี ${createForm.full_name} สำเร็จ`)
      setCreateOpen(false)
      setCreateForm({ full_name: '', email: '', password: '' })
      
      // หน่วงเวลาเล็กน้อยเพื่อให้ Database บันทึกเสร็จสมบูรณ์ก่อนดึงข้อมูลใหม่
      setTimeout(() => {
        fetchAll()
        router.refresh()
      }, 500)
    } catch (err: any) {
      toast.error('สร้างบัญชีไม่สำเร็จ', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (vendorId: string) => {
    const v = vendors.find(v => v.id === vendorId)
    if (!v) return
    setSelectedVendorId(vendorId)
    setEditForm({ full_name: v.full_name, password: '' })
    setEditOpen(true)
  }

  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVendorId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/update-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: selectedVendorId, ...editForm }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('อัปเดตข้อมูลสำเร็จ')
      setEditOpen(false)
      setTimeout(() => { fetchAll(); router.refresh() }, 500)
    } catch (err: any) {
      toast.error('อัปเดตข้อมูลไม่สำเร็จ', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = (vendorId: string, name: string) => {
    setVendorToDelete({ id: vendorId, name })
    setDeleteOpen(true)
  }

  const handleDeleteVendor = async () => {
    if (!vendorToDelete) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/delete-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorToDelete.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('ลบบัญชีสำเร็จ')
      setDeleteOpen(false)
      setTimeout(() => { fetchAll(); router.refresh() }, 500)
    } catch (err: any) {
      toast.error('ลบบัญชีไม่สำเร็จ', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const openAssign = (vendorId: string) => {
    setSelectedVendorId(vendorId)
    const v = vendors.find(v => v.id === vendorId)
    setSelectedRestaurantId(String(v?.restaurant?.id ?? ''))
    setAssignOpen(true)
  }

  const handleAssign = async () => {
    if (!selectedVendorId) return
    setSubmitting(true)
    try {
      await supabase.from('vendor_assignments').delete().eq('vendor_id', selectedVendorId)

      if (selectedRestaurantId) {
        const { error } = await supabase.from('vendor_assignments').insert({
          vendor_id: selectedVendorId,
          restaurant_id: Number(selectedRestaurantId),
        })
        if (error) throw error
        toast.success('มอบหมายร้านให้ผู้ใช้งานเรียบร้อย')
      } else {
        toast.success('ยกเลิกการมอบหมายเรียบร้อย')
      }
      setAssignOpen(false)
      setTimeout(() => {
        fetchAll()
        router.refresh()
      }, 500)
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnassign = async (vendorId: string) => {
    if (!confirm('ยืนยันปลดผู้ใช้งานนี้ออกจากร้านอาหารใช่หรือไม่?')) return
    await supabase.from('vendor_assignments').delete().eq('vendor_id', vendorId)
    toast.success('ปลดผู้ใช้งานเรียบร้อยแล้ว')
    fetchAll()
  }

  const filteredVendors = vendors.filter(v => 
    v.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (v.restaurant?.name.toLowerCase() || '').includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-12 w-32 rounded-full" />
        </div>
        <Skeleton className="h-12 w-96 rounded-2xl" />
        <Skeleton className="h-[500px] w-full rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-500" />
            จัดการบัญชี Vendor
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
            ภาพรวมผู้ใช้งานระดับร้านค้าทั้งหมด <span className="font-bold text-indigo-500">{vendors.length}</span> บัญชี
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 h-12 font-bold shadow-md hover:shadow-lg transition-all active:scale-95">
          <Plus className="w-5 h-5 mr-2" /> สร้างบัญชีใหม่
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input 
          placeholder="ค้นหาชื่อผู้ใช้ หรือ ชื่อร้าน..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-14 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm focus-visible:ring-indigo-500 text-base"
        />
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-slide-up" style={{ animationDelay: '100ms' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">โปรไฟล์ผู้ใช้งาน</th>
                <th className="px-6 py-4">ร้านอาหารที่ดูแล</th>
                <th className="px-6 py-4 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-16 text-slate-400">
                    <UserX className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-base font-medium">ไม่พบผู้ใช้งาน</p>
                  </td>
                </tr>
              ) : filteredVendors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 text-sm shadow-sm">
                        {v.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200 text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{v.full_name}</p>
                        <p className="text-xs font-semibold text-slate-400 font-mono mt-0.5">ID: {v.id.slice(0, 12)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {v.restaurant ? (
                      <Badge className="bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-none font-bold px-3 py-1 shadow-sm inline-flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5" />
                        {v.restaurant.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-400 border-slate-200 px-3 py-1 bg-transparent">
                        ยังไม่ระบุร้าน
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openAssign(v.id)} className="h-9 font-semibold border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors rounded-full px-4" title="กำหนดร้าน">
                        <span className="hidden sm:inline">กำหนดร้าน</span>
                        <UserCheck className="w-4 h-4 sm:hidden" />
                      </Button>
                      {v.restaurant && (
                        <Button variant="outline" size="icon" onClick={() => handleUnassign(v.id)} className="h-9 w-9 rounded-full border-slate-200 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-600 transition-colors" title="ปลดออกจากร้าน">
                          <UserX className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="icon" onClick={() => openEdit(v.id)} className="h-9 w-9 rounded-full border-slate-200 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="แก้ไขผู้ใช้งาน">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => confirmDelete(v.id, v.full_name)} disabled={submitting} className="h-9 w-9 rounded-full border-slate-200 hover:border-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors" title="ลบบัญชีผู้ใช้">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Vendor Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-border/50 bg-slate-50/50 dark:bg-slate-800/50">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-slate-900 dark:text-white">
              <Users className="w-5 h-5 text-indigo-500" />
              สร้างบัญชี Vendor ใหม่
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateVendor} className="px-6 py-5 space-y-5">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 dark:text-slate-300">ชื่อ-นามสกุล <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input required value={createForm.full_name} onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })} className="pl-11 h-12 rounded-xl focus-visible:ring-indigo-500 bg-slate-50 dark:bg-slate-800 text-base" placeholder="เช่น เจ๊นก สมใจ" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 dark:text-slate-300">อีเมลลงชื่อเข้าใช้ <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input required type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} className="pl-11 h-12 rounded-xl focus-visible:ring-indigo-500 bg-slate-50 dark:bg-slate-800 text-base" placeholder="vendor@foodwonderland.com" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 dark:text-slate-300">รหัสผ่าน <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input required type="password" minLength={6} value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} className="pl-11 h-12 rounded-xl focus-visible:ring-indigo-500 bg-slate-50 dark:bg-slate-800 text-base font-mono" placeholder="ใช้อย่างน้อย 6 ตัวอักษร" />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 sm:justify-end gap-3 sm:gap-0 mt-6">
              <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} className="rounded-full font-bold bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 py-6 px-6 shadow-sm">
                ยกเลิก
              </Button>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all active:scale-95 py-6 px-8 sm:ml-2">
                {submitting ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชีผู้ใช้งาน'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Restaurant Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-border/50 bg-slate-50/50 dark:bg-slate-800/50">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-slate-900 dark:text-white">
              <KeyRound className="w-5 h-5 text-indigo-500" />
              กำหนดสิทธิ์ดูแลร้านอาหาร
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-6 space-y-4">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 dark:text-slate-300">เลือกร้านอาหารเป้าหมาย</Label>
              <select
                value={selectedRestaurantId}
                onChange={e => setSelectedRestaurantId(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 h-12 text-sm bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-700 dark:text-slate-300 font-bold appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
              >
                <option value="">— ไม่กำหนดร้าน (ยกเลิกสิทธิ์) —</option>
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-blue-800 dark:text-blue-300 text-sm font-medium">
              <p>ผู้ใช้งานหนึ่งคนสามารถดูแลร้านอาหารได้สูงสุด 1 ร้านในเวลาเดียวกัน หากร้านถูกลบ สิทธิ์ของผู้ใช้จะหายไปอัตโนมัติ</p>
            </div>
          </div>

          <DialogFooter className="m-0 px-6 py-5 border-t border-slate-100 dark:border-slate-800 sm:justify-end gap-3 sm:gap-0 bg-slate-50/50 dark:bg-slate-800/50">
            <Button variant="secondary" onClick={() => setAssignOpen(false)} className="rounded-full font-bold bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 py-6 px-6 shadow-sm">ยกเลิก</Button>
            <Button disabled={submitting} onClick={handleAssign} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all py-6 px-8 sm:ml-2">
              {submitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนสิทธิ์'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-border/50 bg-slate-50/50 dark:bg-slate-800/50">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-slate-900 dark:text-white">
              <UserCog className="w-5 h-5 text-indigo-500" />
              แก้ไขข้อมูลบัญชี
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateVendor} className="px-6 py-5 space-y-5">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 dark:text-slate-300">ชื่อ-นามสกุล <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input required value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} className="pl-11 h-12 rounded-xl focus-visible:ring-indigo-500 bg-slate-50 dark:bg-slate-800 text-base" placeholder="เช่น เจ๊นก สมใจ" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 dark:text-slate-300">เปลี่ยนรหัสผ่าน <span className="text-slate-400 font-normal text-xs">(ปล่อยว่างไว้หากไม่ต้องการเปลี่ยน)</span></Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input type="password" minLength={6} value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} className="pl-11 h-12 rounded-xl focus-visible:ring-indigo-500 bg-slate-50 dark:bg-slate-800 text-base font-mono" placeholder="รหัสผ่านใหม่" />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 sm:justify-end gap-3 sm:gap-0 mt-6">
              <Button type="button" variant="secondary" onClick={() => setEditOpen(false)} className="rounded-full font-bold bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 py-6 px-6 shadow-sm">
                ยกเลิก
              </Button>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all active:scale-95 py-6 px-8 sm:ml-2">
                {submitting ? 'กำลังอัปเดต...' : 'บันทึกการแก้ไข'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Vendor Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-border/50 bg-rose-50/50 dark:bg-rose-900/10">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-5 h-5" />
              ยืนยันการลบบัญชี
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-6 space-y-4 text-slate-700 dark:text-slate-300">
            <p>
              คุณแน่ใจหรือไม่ที่จะลบบัญชี <strong>"{vendorToDelete?.name}"</strong> ออกจากระบบ?
            </p>
            <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl text-rose-800 dark:text-rose-300 text-sm font-medium border border-rose-100 dark:border-rose-800/50">
              <p>คำเตือน: การกระทำนี้ไม่สามารถย้อนกลับได้ สิทธิ์การจัดการร้านอาหารและประวัติทั้งหมดของผู้ใช้นี้จะถูกลบไปด้วย</p>
            </div>
          </div>

          <DialogFooter className="m-0 px-6 py-5 border-t border-slate-100 dark:border-slate-800 sm:justify-end gap-3 sm:gap-0 bg-slate-50/50 dark:bg-slate-800/50">
            <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)} className="rounded-full font-bold bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 py-6 px-6 shadow-sm">
              ยกเลิก
            </Button>
            <Button type="button" onClick={handleDeleteVendor} disabled={submitting} className="bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all active:scale-95 py-6 px-8 sm:ml-2">
              {submitting ? 'กำลังลบ...' : 'ยืนยันลบบัญชี'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
