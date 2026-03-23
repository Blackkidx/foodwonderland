'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCartStore } from '@/store/cartStore'
import { ShoppingCart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { OrderTrackerBadge } from '@/components/customer/OrderTrackerBadge'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { getTotalItems } = useCartStore()
  const totalItems = getTotalItems()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header — safe-area padding for notched phones */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-14 sm:h-16 md:h-18 lg:h-20 flex items-center justify-between">
          <Link href="/restaurants" className="flex items-center gap-2 sm:gap-3 active:scale-95 transition-transform pt-1">
            <Image src="/logo.webp" alt="FoodWonderland Logo" width={40} height={40} className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 drop-shadow-sm" priority />
            <span className="hidden xs:inline font-black text-xl sm:text-2xl md:text-[26px] tracking-tight bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent pb-1">FoodWonderland</span>
            <span className="xs:hidden font-black text-xl tracking-tight text-primary pb-1">FW</span>
          </Link>
          <div className="flex items-center gap-2 md:gap-4">
            <OrderTrackerBadge />
            <Link href="/cart" className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-90 flex-shrink-0">
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-slate-700 dark:text-slate-300" />
              {mounted && totalItems > 0 && (
                <Badge className="absolute -top-0.5 -right-0.5 h-5 w-5 md:h-6 md:w-6 flex items-center justify-center p-0 text-[10px] md:text-xs bg-primary text-primary-foreground border-2 border-white dark:border-slate-900 font-bold">
                  {totalItems}
                </Badge>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Page Content — fluid width with responsive padding */}
      <main className="w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-8 lg:py-10 pb-20 sm:pb-8 md:pb-12">
        {children}
      </main>
    </div>
  )
}
