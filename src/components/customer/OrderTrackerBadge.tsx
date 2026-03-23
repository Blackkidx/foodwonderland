'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Bell, ChefHat, CheckCircle2 } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function OrderTrackerBadgeComponent() {
  const [activeCount, setActiveCount] = useState(0)
  const [hasReady, setHasReady] = useState(false)
  const sessionToken = useCartStore((state) => state.sessionToken)
  const supabaseRef = useRef(createClient())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!sessionToken) return

    const supabase = supabaseRef.current

    const fetchOrderStats = async () => {
      const { data } = await supabase
        .from('orders')
        .select('status')
        .eq('session_token', sessionToken)
        .in('status', ['paid', 'cooking', 'ready'])

      if (data) {
        setActiveCount(data.length)
        setHasReady(data.some(o => o.status === 'ready'))
      }
    }

    fetchOrderStats()

    const channel = supabase
      .channel(`orders-badge-${sessionToken}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `session_token=eq.${sessionToken}` },
        () => {
          fetchOrderStats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionToken])

  if (!mounted || !sessionToken || activeCount === 0) return (
    <div className="relative p-2 w-10 h-10 flex items-center justify-center">
      <Bell className="w-6 h-6 text-slate-400" />
    </div>
  )

  return (
    <Link href="/orders" className="relative p-2 group flex items-center justify-center transition-transform hover:scale-110 active:scale-95 duration-300">
      <div className={`absolute inset-0 rounded-full transition-all duration-500 ${hasReady ? 'bg-green-100 dark:bg-green-900/30 blur-md' : 'bg-primary/10 blur-sm'}`}></div>
      
      {hasReady ? (
        <CheckCircle2 className="w-6 h-6 text-green-500 relative z-10 animate-pulse drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
      ) : (
        <ChefHat className="w-6 h-6 text-primary relative z-10 animate-hover-lift drop-shadow-[0_0_5px_rgba(251,146,60,0.4)]" />
      )}
      
      {/* Active order count badge */}
      <span className={`absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white rounded-full border-2 border-background shadow-sm transition-all duration-300 ${hasReady ? 'bg-green-500 animate-bounce' : 'bg-primary scale-100'}`}>
        {activeCount}
      </span>
    </Link>
  )
}

export const OrderTrackerBadge = React.memo(OrderTrackerBadgeComponent)
