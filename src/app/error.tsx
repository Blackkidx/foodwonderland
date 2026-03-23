'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RotateCcw } from 'lucide-react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('FoodWonderland Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 selection:bg-rose-500/20 selection:text-rose-500 relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-sm w-full text-center animate-fade-in">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl border border-rose-100 dark:border-rose-900/30 shadow-2xl rounded-[3rem] p-10 sm:p-14 animate-slide-up relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-2 bg-rose-500" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-500/10 rounded-3xl flex items-center justify-center mb-6 shadow-inner rotate-3 hover:rotate-6 transition-transform">
              <AlertCircle className="w-10 h-10 text-rose-500" strokeWidth={2} />
            </div>
            
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
              เกิดข้อผิดพลาด
            </h1>
            
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed text-sm">
              ขออภัย ระบบเกิดข้อผิดพลาดบางอย่าง โปรดลองใหม่อีกครั้งหรือติดต่อเจ้าหน้าที่
            </p>
            
            <Button 
              onClick={() => reset()} 
              className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-full h-14 font-bold shadow-lg shadow-rose-500/25 hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 text-base"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              ลองใหม่อีกครั้ง
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
