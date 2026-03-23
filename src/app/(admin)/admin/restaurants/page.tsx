'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Edit2, Trash2, Upload, Store, Image as ImageIcon, QrCode, UtensilsCrossed, ExternalLink, Search } from 'lucide-react'

interface Category { id: number; name: string; icon: string }
interface Restaurant {
  id: number; name: string; category_id: number | null
  logo_url: string | null; qr_payment_url: string | null; is_active: boolean
  categories?: { name: string; icon: string } | null
}

const emptyForm = { name: '', category_id: '', is_active: true }

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [restaurantToDelete, setRestaurantToDelete] = useState<{ id: number; name: string } | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const router = useRouter()

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const [{ data: rests }, { data: cats }] = await Promise.all([
      supabase.from('restaurants').select('*, categories(name, icon)').order('id'),
      supabase.from('categories').select('*').order('id'),
    ])
    if (rests) setRestaurants(rests as Restaurant[])
    if (cats) setCategories(cats)
    setLoading(false)
  }

  const uploadImage = async (file: File, bucket: string, prefix: string): Promise<string> => {
    const ext = file.name.split('.').pop()
    const fileName = `${prefix}-${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true })
    if (error) throw error
    return supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl
  }

  const openForm = (restaurant?: Restaurant) => {
    if (restaurant) {
      setEditingId(restaurant.id)
      setForm({ name: restaurant.name, category_id: String(restaurant.category_id ?? ''), is_active: restaurant.is_active })
      setLogoPreview(restaurant.logo_url)
    } else {
      setEditingId(null)
      setForm(emptyForm)
      setLogoPreview(null)
    }
    setLogoFile(null)
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) return
    setSubmitting(true)
    try {
      let logo_url = logoPreview

      if (logoFile) logo_url = await uploadImage(logoFile, 'restaurant-images', 'logo')

      const payload = {
        name: form.name,
        category_id: form.category_id ? Number(form.category_id) : null,
        is_active: form.is_active,
        logo_url,
      }

      if (editingId) {
        await supabase.from('restaurants').update(payload).eq('id', editingId)
        toast.success('อัปเดตร้านอาหารแล้ว')
      } else {
        await supabase.from('restaurants').insert(payload)
        toast.success('เพิ่มร้านอาหารใหม่แล้ว')
      }
      setOpen(false)
      
      // หน่วงเวลาให้ Supabase อัปเดตข้อมูลเสร็จแล้วค่อย Refresh UI
      setTimeout(() => {
        fetchData()
        router.refresh()
      }, 500)
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = (id: number, name: string) => {
    setRestaurantToDelete({ id, name })
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!restaurantToDelete) return
    const id = restaurantToDelete.id

    setDeleteOpen(false)
    
    // Optimistic update
    setRestaurants(prev => prev.filter(r => r.id !== id))
    
    const { error } = await supabase.from('restaurants').delete().eq('id', id)
    if (error) {
      toast.error('เกิดข้อผิดพลาดในการลบ')
      fetchData() // Revert
    } else {
      toast.success('ลบร้านอาหารแล้ว')
    }
  }

  const toggleActive = async (id: number, current: boolean) => {
    // Optimistic update
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, is_active: !current } : r))
    
    const { error } = await supabase.from('restaurants').update({ is_active: !current }).eq('id', id)
    if (error) {
      toast.error('อัปเดตสถานะไม่สำเร็จ')
      setRestaurants(prev => prev.map(r => r.id === id ? { ...r, is_active: current } : r)) // Revert
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo') => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (type === 'logo') { setLogoFile(file); setLogoPreview(url) }
  }

  const filteredRestaurants = restaurants.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-12 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-72 w-full rounded-3xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Store className="w-8 h-8 text-primary" />
            จัดการร้านอาหาร
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
            ภาพรวมร้านอาหารทั้งหมดในระบบ จำนวนผู้ประกอบการ <span className="font-bold text-primary">{restaurants.length}</span> ร้าน
          </p>
        </div>
        <Button onClick={() => openForm()} className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 h-12 font-bold shadow-md hover:shadow-lg transition-all active:scale-95">
          <Plus className="w-5 h-5 mr-2" /> เพิ่มร้านอาหารใหม่
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input 
          placeholder="ค้นหาร้านอาหาร..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-14 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm focus-visible:ring-primary text-base"
        />
      </div>

      {/* Restaurant Grid */}
      {filteredRestaurants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 animate-slide-up">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600">
            <Store className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">ไม่พบข้อมูลร้านอาหาร</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">ลองค้นหาด้วยคำอื่น หรือเพิ่มร้านอาหารใหม่ในระบบ</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredRestaurants.map((r, index) => (
            <div 
              key={r.id} 
              className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group ${!r.is_active ? 'opacity-70 grayscale-[0.3]' : ''} animate-slide-up`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Header/Cover Image (Using Logo as blurred background) */}
              <div className="relative h-24 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                {r.logo_url && (
                  <div 
                    className="absolute inset-0 bg-cover bg-center blur-md opacity-40 scale-110" 
                    style={{ backgroundImage: `url(${r.logo_url})` }} 
                  />
                )}
                {/* Status Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <div className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${r.is_active ? 'bg-green-500/90 text-white' : 'bg-slate-800/90 text-slate-300'}`}>
                    {r.is_active ? 'เปิดร้าน' : 'ปิดร้านชั่วคราว'}
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="px-6 flex-1 flex flex-col pt-0 relative z-10">
                {/* Logo Overlap */}
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-md flex items-center justify-center overflow-hidden -mt-10 mb-3 bg-slate-50 flex-shrink-0">
                  {r.logo_url ? (
                    <img src={r.logo_url} alt={r.name} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-8 h-8 text-slate-300" />
                  )}
                </div>

                <div className="mb-6 mt-auto">
                  <h3 className="font-extrabold text-xl text-slate-900 dark:text-white line-clamp-1 mb-1">{r.name}</h3>
                  <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm font-medium">
                    <UtensilsCrossed className="w-3.5 h-3.5 mr-1.5" />
                    {r.categories ? (
                      <span className="flex items-center gap-1.5">
                        <span className="text-base leading-none">{r.categories.icon}</span> 
                        {r.categories.name}
                      </span>
                    ) : (
                      'ไม่มีหมวดหมู่'
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={r.is_active} 
                    onCheckedChange={() => toggleActive(r.id, r.is_active)}
                    className="data-[state=checked]:bg-green-500"
                  />
                  <span className="text-xs font-semibold text-slate-500">เปิด-ปิดร้าน</span>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-slate-200 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors" onClick={() => openForm(r)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-slate-200 hover:border-red-500 hover:bg-red-50 hover:text-red-600 transition-colors" onClick={() => confirmDelete(r.id, r.name)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modern Modal Form */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-border/50 bg-slate-50/50 dark:bg-slate-800/50">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-slate-900 dark:text-white">
              {editingId ? <Edit2 className="w-5 h-5 text-blue-500" /> : <Store className="w-5 h-5 text-primary" />}
              {editingId ? 'แก้ไขข้อมูลร้านอาหาร' : 'เพิ่มร้านอาหารใหม่ลงระบบ'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
            {/* Logo Upload */}
            <div className="flex flex-col max-w-[200px] mx-auto">
              <Label className="font-bold text-slate-700 dark:text-slate-300 mb-2 text-center">โลโก้ร้าน <span className="text-slate-400 font-normal text-xs">(แนะนำ 1:1)</span></Label>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'logo')} />
              <div 
                onClick={() => logoRef.current?.click()}
                className="w-full aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer border-slate-300 hover:border-primary hover:bg-primary/5 transition-all overflow-hidden bg-slate-50 dark:bg-slate-800 group relative shadow-inner"
              >
                {logoPreview ? (
                  <>
                    <img src={logoPreview} alt="preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="w-8 h-8 text-white mb-2" />
                      <span className="text-sm font-bold text-white">เปลี่ยนโลโก้</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center group-hover:-translate-y-1 transition-transform p-4">
                    <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-slate-400 group-hover:text-primary transition-colors">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-500">อัปโหลดโลโก้</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 dark:text-slate-300">ชื่อร้านอาหาร <span className="text-red-500">*</span></Label>
                <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-12 rounded-xl focus-visible:ring-primary bg-slate-50 dark:bg-slate-800 text-base font-semibold" placeholder="เช่น เจ๊นก ส้มตำแซ่บ" />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700 dark:text-slate-300">หมวดหมู่ร้าน</Label>
                <select
                  value={form.category_id}
                  onChange={e => setForm({ ...form, category_id: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 h-12 text-sm bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-700 dark:text-slate-300 font-medium appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                >
                  <option value="">— ไม่ระบุหมวดหมู่ —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <Switch 
                  checked={form.is_active} 
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })} 
                  className="data-[state=checked]:bg-green-500"
                />
                <div>
                  <Label className="font-bold text-slate-700 dark:text-slate-300 block cursor-pointer" onClick={() => setForm({ ...form, is_active: !form.is_active })}>เปิดให้บริการทันที</Label>
                  <p className="text-xs text-slate-500 mt-0.5">ร้านจะปรากฏบนหน้าระบบเพื่อให้ลูกค้าสามารถสั่งอาหารได้</p>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 sm:justify-end gap-3 sm:gap-0 mt-6">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-full font-bold hover:bg-slate-100 dark:hover:bg-slate-800 py-6 px-6">
                ยกเลิก
              </Button>
              <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all active:scale-95 py-6 px-8 sm:ml-2">
                {submitting ? 'กำลังส่งข้อมูล...' : 'บันทึกข้อมูลร้าน'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Restaurant Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-border/50 bg-rose-50/50 dark:bg-rose-900/10">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-5 h-5" />
              ยืนยันการลบร้านอาหาร
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-6 space-y-4 text-slate-700 dark:text-slate-300">
            <p>
              คุณแน่ใจหรือไม่ที่จะลบร้าน <strong>"{restaurantToDelete?.name}"</strong> ออกจากระบบ?
            </p>
            <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl text-rose-800 dark:text-rose-300 text-sm font-medium border border-rose-100 dark:border-rose-800/50">
              <p>คำเตือน: การกระทำนี้ไม่สามารถย้อนกลับได้ ข้อมูลเมนูอาหารและรายการทั้งหมดที่เกี่ยวข้องจะถูกลบอย่างถาวร</p>
            </div>
          </div>

          <DialogFooter className="m-0 px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 sm:justify-end gap-3 sm:gap-0">
            <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)} className="rounded-full font-bold bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 py-6 px-6 shadow-sm">
              ยกเลิก
            </Button>
            <Button type="button" onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all active:scale-95 py-6 px-8 sm:ml-2">
              ยืนยันลบร้านอาหาร
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
