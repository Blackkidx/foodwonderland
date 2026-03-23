'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Plus, Edit2, Trash2, Upload, UtensilsCrossed, AlertCircle, Image as ImageIcon, Search, PackageCheck } from 'lucide-react'
import { Menu } from '@/types'

export default function VendorMenusPage() {
  const [restaurantId, setRestaurantId] = useState<number | null>(null)
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  // Form State
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '', description: '', price: 0, stock: 0, low_stock_threshold: 5, is_available: true,
    has_special_option: false, special_option_price: 10
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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
      await fetchMenus(assignment.restaurant_id)
    }
    init()
  }, [])

  const fetchMenus = async (resId: number) => {
    const { data } = await supabase
      .from('menus')
      .select('*')
      .eq('restaurant_id', resId)
      .order('id')
    if (data) setMenus(data)
    setLoading(false)
  }

  const handleOpenForm = (menu?: Menu) => {
    if (menu) {
      setEditingId(menu.id)
      setFormData({
        name: menu.name,
        description: menu.description || '',
        price: menu.price,
        stock: menu.stock,
        low_stock_threshold: menu.low_stock_threshold,
        is_available: menu.is_available,
        has_special_option: menu.has_special_option ?? false,
        special_option_price: menu.special_option_price ?? 10,
      })
      setImagePreview(menu.image_url)
    } else {
      setEditingId(null)
      setFormData({ name: '', description: '', price: 0, stock: 0, low_stock_threshold: 5, is_available: true, has_special_option: false, special_option_price: 10 })
      setImagePreview(null)
    }
    setImageFile(null)
    setOpen(true)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restaurantId || !formData.name) return
    setSubmitting(true)

    try {
      let imageUrl = imagePreview

      // Upload new image if selected
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const fileName = `menu-${restaurantId}-${Date.now()}.${ext}`
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('menu-images')
          .upload(fileName, imageFile)
        
        if (uploadErr) throw uploadErr
        
        imageUrl = supabase.storage.from('menu-images').getPublicUrl(uploadData.path).data.publicUrl
      }

      const payload = { ...formData, image_url: imageUrl, restaurant_id: restaurantId }

      if (editingId) {
        const { error } = await supabase.from('menus').update(payload).eq('id', editingId)
        if (error) throw error
        toast.success('อัปเดตเมนูแล้ว')
      } else {
        const { error } = await supabase.from('menus').insert(payload)
        if (error) throw error
        toast.success('เพิ่มเมนูใหม่แล้ว')
      }

      setOpen(false)
      fetchMenus(restaurantId)
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('แน่ใจหรือไม่ที่จะลบเมนูนี้?')) return
    await supabase.from('menus').delete().eq('id', id)
    toast.success('ลบเมนูแล้ว')
    setMenus(prev => prev.filter(m => m.id !== id))
  }

  const toggleStatus = async (id: number, current: boolean) => {
    // Optimistic update
    setMenus(prev => prev.map(m => m.id === id ? { ...m, is_available: !current } : m))
    
    const { error } = await supabase.from('menus').update({ is_available: !current }).eq('id', id)
    if (error) {
      toast.error('อัปเดตสถานะไม่สำเร็จ')
      // Revert if error
      setMenus(prev => prev.map(m => m.id === id ? { ...m, is_available: current } : m))
    }
  }

  const filteredMenus = menus.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-12 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-72 w-full rounded-3xl" />)}
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
            <UtensilsCrossed className="w-8 h-8 text-primary" />
            จัดการเมนูอาหาร
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">เพิ่ม ลบ หรือแก้ไขรายการอาหารในร้านของคุณ</p>
        </div>
        <Button onClick={() => handleOpenForm()} className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 h-12 font-bold shadow-md hover:shadow-lg transition-all active:scale-95">
          <Plus className="w-5 h-5 mr-2" /> เพิ่มเมนูใหม่
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input 
          placeholder="ค้นหาชื่อเมนู..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-14 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm focus-visible:ring-primary text-base"
        />
      </div>

      {/* Menu Grid */}
      {filteredMenus.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 animate-slide-up">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600">
            <UtensilsCrossed className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">ไม่พบเมนู</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">คุณสามารถเพิ่มเมนูใหม่ได้โดยคลิกที่ปุ่ม "เพิ่มเมนูใหม่"</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMenus.map((menu, index) => {
            const isLowStock = menu.stock <= menu.low_stock_threshold
            
            return (
              <div 
                key={menu.id} 
                className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group ${!menu.is_available ? 'opacity-60 grayscale-[0.5]' : ''} animate-slide-up`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Image Area */}
                <div className="relative h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {menu.image_url ? (
                    <img 
                      src={menu.image_url} 
                      alt={menu.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                      <ImageIcon className="w-10 h-10 mb-2" />
                      <span className="text-xs font-semibold">ไม่มีรูปภาพ</span>
                    </div>
                  )}
                  {/* Status Overlay */}
                  <div className="absolute top-4 left-4">
                    <div className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${menu.is_available ? 'bg-green-500/90 text-white' : 'bg-slate-800/90 text-slate-300'}`}>
                      {menu.is_available ? 'เปิดขาย' : 'ปิดขาย'}
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white line-clamp-1 flex-1 pr-2">{menu.name}</h3>
                    <span className="font-extrabold text-primary text-xl">฿{menu.price.toLocaleString()}</span>
                  </div>

                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-1">
                    {menu.description || 'ไม่มีคำอธิบาย'}
                  </p>

                  <div className={`flex items-center gap-2 mb-4 p-2.5 rounded-xl border ${isLowStock ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent'} transition-colors`}>
                    {isLowStock ? <AlertCircle className="w-5 h-5 text-red-500" /> : <PackageCheck className="w-5 h-5 text-slate-400" />}
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">คงเหลือสุทธิ</p>
                      <p className={`text-sm font-extrabold ${isLowStock ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        {menu.stock} หน่วย
                      </p>
                    </div>
                  </div>

                  {/* Actions Layer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={menu.is_available} 
                        onCheckedChange={() => toggleStatus(menu.id, menu.is_available)}
                        className="data-[state=checked]:bg-green-500"
                      />
                      <span className="text-xs font-semibold text-slate-500">สถานะ</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-slate-200 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors" onClick={() => handleOpenForm(menu)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-slate-200 hover:border-red-500 hover:bg-red-50 hover:text-red-600 transition-colors" onClick={() => handleDelete(menu.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modern Modal Form */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-0 overflow-hidden sm:max-w-xl">
          <DialogHeader className="px-6 py-5 border-b border-border/50 bg-slate-50/50 dark:bg-slate-800/50">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-slate-900 dark:text-white">
              {editingId ? <Edit2 className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-primary" />}
              {editingId ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
            {/* Image Upload Area */}
            <div className="flex flex-col items-center">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              <div 
                onClick={() => fileRef.current?.click()}
                className="w-40 h-40 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer border-slate-300 hover:border-primary hover:bg-primary/5 transition-all overflow-hidden bg-slate-50 dark:bg-slate-800 group relative shadow-inner"
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="w-6 h-6 text-white mb-1" />
                      <span className="text-xs font-bold text-white">เปลี่ยนรูปภาพ</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center group-hover:-translate-y-1 transition-transform">
                    <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-slate-400 group-hover:text-primary transition-colors">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-500">อัปโหลดรูปภาพ</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 dark:text-slate-300">ชื่อเมนู <span className="text-red-500">*</span></Label>
                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-12 rounded-xl focus-visible:ring-primary bg-slate-50 dark:bg-slate-800" placeholder="เช่น ผัดกะเพราหมูสับ" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 dark:text-slate-300">ราคา (บาท) <span className="text-red-500">*</span></Label>
                  <Input type="number" required min={0} value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="h-12 rounded-xl focus-visible:ring-primary bg-slate-50 dark:bg-slate-800 font-bold text-primary text-lg" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 dark:text-slate-300">จำนวนตั้งต้น <span className="text-red-500">*</span></Label>
                  <Input type="number" required min={0} value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} className="h-12 rounded-xl focus-visible:ring-primary bg-slate-50 dark:bg-slate-800" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700 dark:text-slate-300">แจ้งเตือนสินค้าใกล้หมด (ชิ้น)</Label>
                <Input type="number" required min={0} value={formData.low_stock_threshold} onChange={e => setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })} className="h-12 rounded-xl focus-visible:ring-primary bg-slate-50 dark:bg-slate-800" />
                <p className="text-xs text-slate-500 mt-1">ระบบจะแจ้งเตือนเมื่อสต๊อกเหลือน้อยกว่าค่านี้</p>
              </div>

              {/* Special Option */}
              <div className="space-y-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-bold text-slate-700 dark:text-slate-300 text-sm">ตัวเลือกพิเศษ (+ราคา)</Label>
                    <p className="text-xs text-slate-500 mt-0.5">เปิดเพื่อให้ลูกค้าเลือก &quot;พิเศษ&quot; ได้</p>
                  </div>
                  <Switch
                    checked={formData.has_special_option}
                    onCheckedChange={(val) => setFormData({ ...formData, has_special_option: val })}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>
                {formData.has_special_option && (
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700 dark:text-slate-300 text-sm">ราคาพิเศษเพิ่ม (บาท)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.special_option_price}
                      onChange={e => setFormData({ ...formData, special_option_price: Number(e.target.value) })}
                      className="h-10 rounded-xl focus-visible:ring-amber-500 bg-white dark:bg-slate-800 font-bold text-amber-500"
                      placeholder="เช่น 10"
                    />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 sm:justify-end gap-3 sm:gap-0 mt-6">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-full font-bold hover:bg-slate-100 dark:hover:bg-slate-800 py-6 px-6">ยกเลิก</Button>
              <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all active:scale-95 py-6 px-8 sm:ml-2">
                {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
