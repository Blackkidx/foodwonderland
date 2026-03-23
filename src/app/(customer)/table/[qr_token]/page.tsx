'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { use, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { useCartStore } from '@/store/cartStore'

export default function TablePage({ params }: { params: Promise<{ qr_token: string }> }) {
  const { qr_token } = use(params)
  const [validating, setValidating] = useState(true)
  const [invalid, setInvalid] = useState(false)
  const router = useRouter()
  const { setTable } = useCartStore()
  const supabase = createClient()

  useEffect(() => {
    async function validateQR() {
      const { data, error } = await supabase
        .from('tables')
        .select('id, table_number')
        .eq('qr_token', qr_token)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        setInvalid(true)
      } else {
        // setTable จะสร้าง sessionToken ใหม่ + ล้างตะกร้าเก่าโดยอัตโนมัติ
        setTable(data.id, data.table_number)
        toast.success(`ยินดีต้อนรับสู่ FoodWonderland! โต๊ะ ${data.table_number}`)
        router.push('/restaurants')
      }
      setValidating(false)
    }
    validateQR()
  }, [qr_token])

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 font-medium">กำลังตรวจสอบ QR Code...</p>
        </div>
      </div>
    )
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center shadow-xl border-red-100">
          <CardContent className="pt-8 pb-6 space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-500">QR ไม่ถูกต้อง</h2>
            <p className="text-slate-500 text-sm">QR Code นี้ไม่ถูกต้องหรือโต๊ะนี้ไม่เปิดให้บริการ</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
