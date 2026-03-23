'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SearchX, Home, UtensilsCrossed } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 selection:bg-primary/20 selection:text-primary relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-orange-400/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-md w-full text-center animate-fade-in">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/20 dark:border-slate-800 shadow-2xl rounded-[3rem] p-10 sm:p-14 animate-slide-up relative overflow-hidden group">
          
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="relative z-10 flex flex-col items-center">
            {/* Icon Container with glowing effect */}
            <div className="relative mb-8 group-hover:scale-110 transition-transform duration-500 ease-out">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-orange-500/20 rounded-full flex items-center justify-center border border-primary/20 shadow-inner relative z-10">
                <SearchX className="w-12 h-12 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            
            <h1 className="text-[5rem] leading-none font-black text-slate-900 dark:text-white mb-2 tracking-tighter">
              4<span className="text-primary">0</span>4
            </h1>
            
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-3">
              อ้าว... หาไม่เจอ!
            </h2>
            
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed max-w-[280px] mx-auto text-sm">
              หน้านี้อาจถูกย้ายไปที่อื่น หรือลิงก์ที่คุณเข้ามาอาจไม่ถูกต้อง กลับไปสั่งอาหารอร่อยๆ กันต่อดีกว่าครับ
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <Link href="/restaurants" className="w-full sm:w-auto">
                <Button className="w-full bg-primary hover:bg-primary/90 text-white rounded-full h-14 px-8 font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 text-base">
                  <UtensilsCrossed className="w-5 h-5 mr-2" />
                  เลือกร้านอาหาร
                </Button>
              </Link>
              <Link href="/" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full h-14 px-8 font-bold text-slate-600 dark:text-slate-300 transition-all hover:-translate-y-1 text-base">
                  <Home className="w-5 h-5 mr-2 text-slate-400" />
                  หน้าหลัก
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center animate-fade-in" style={{ animationDelay: '400ms' }}>
        <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Food WonderLand 2026</p>
      </div>
    </div>
  )
}
