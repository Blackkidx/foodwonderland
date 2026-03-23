'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Package, LogOut, Store, Menu, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vendor/orders', label: 'Orders', icon: ClipboardList },
  { href: '/vendor/menus', label: 'เมนู', icon: UtensilsCrossed },
  { href: '/vendor/stock', label: 'Stock', icon: Package },
]

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const supabase = createClient()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'vendor') {
        toast.error('ไม่มีสิทธิ์เข้าถึงหน้านี้')
        window.location.href = '/'
      } else {
        setIsAuthorized(true)
      }
    }
    checkRole()
  }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('ออกจากระบบแล้ว')
    window.location.href = '/login'
  }

  if (!isAuthorized) return null

  return (
    <div className="flex min-h-screen bg-transparent font-sans">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — slides in on mobile (hidden), mini on tablet (md), fixed on desktop (lg) */}
      <aside className={cn(
        'fixed top-0 left-0 h-full bg-slate-900 dark:bg-black text-white flex flex-col z-50 shadow-2xl transition-all duration-300 ease-out',
        sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64',
        'md:translate-x-0 md:w-20 lg:w-64'
      )}>
        {/* Logo */}
        <div className="px-4 lg:px-6 py-4 lg:py-8 border-b border-slate-800/60 relative overflow-hidden flex items-center justify-between md:justify-center lg:justify-start min-h-[72px] lg:min-h-[104px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="flex flex-col relative z-10 w-full md:items-center lg:items-start transition-all">
            <p className="hidden lg:block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 opacity-80">ระบบหลังร้าน</p>
            <div className="flex items-center gap-2.5 justify-start md:justify-center lg:justify-start w-full">
              <Image src="/logo.webp" alt="FoodWonderland Logo" width={36} height={36} className="w-8 h-8 lg:w-9 lg:h-9 flex-shrink-0 drop-shadow-sm" priority />
              <h1 className="block md:hidden lg:block text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 truncate">
                FoodWonderland
              </h1>
            </div>
          </div>
          {/* Close button on mobile */}
          <button onClick={() => setSidebarOpen(false)} className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors flex-shrink-0 relative z-20">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-6 space-y-2 px-3 lg:px-4 overflow-y-auto hide-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  'flex items-center gap-3.5 px-3 lg:px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 group',
                  active
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                  'md:justify-center lg:justify-start'
                )}
              >
                <Icon className={cn('w-6 h-6 lg:w-5 lg:h-5 transition-transform duration-300 flex-shrink-0', active ? 'scale-110 lg:scale-100' : 'group-hover:scale-110')} />
                <span className="block md:hidden lg:block truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 lg:px-4 pb-6 mt-auto">
          <button
            onClick={handleLogout}
            title="ออกจากระบบ"
            className="flex items-center gap-2.5 w-full px-3 lg:px-4 py-3 rounded-xl text-sm font-bold text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-red-400 hover:border-red-900/50 transition-all active:scale-95 md:justify-center lg:justify-start"
          >
            <LogOut className="w-6 h-6 lg:w-4 lg:h-4 flex-shrink-0" />
            <span className="block md:hidden lg:block truncate">ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area — adapts to sidebar */}
      <div className="flex-1 md:ml-20 lg:ml-64 min-h-screen flex flex-col transition-all duration-300">
        {/* Mobile Top Bar */}
        <header className="sticky top-0 z-30 md:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between h-14 px-4">
            <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-90">
              <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </button>
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              <span className="font-bold text-slate-800 dark:text-white">Vendor Panel</span>
            </div>
            <div className="w-10" /> {/* spacer for centering */}
          </div>
        </header>

        <main className="flex-1">
          <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 mb-20 md:mb-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
