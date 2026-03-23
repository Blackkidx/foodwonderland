'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, UtensilsCrossed, Users, Table2, LogOut, ChefHat, Menu, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin/dashboard',   label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/admin/restaurants', label: 'ร้านอาหาร',     icon: UtensilsCrossed },
  { href: '/admin/vendors',     label: 'Vendors',       icon: Users },
  { href: '/admin/tables',      label: 'โต๊ะ & QR',     icon: Table2 },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const supabase = createClient()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'super_admin') {
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
    <div className="flex min-h-screen bg-transparent selection:bg-primary/20 selection:text-primary">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full bg-slate-900 dark:bg-slate-950 border-r border-slate-800 dark:border-slate-800/50 text-slate-300 flex flex-col z-50 shadow-xl transition-transform duration-300 ease-out',
        sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64',
        'md:translate-x-0 md:w-20 lg:w-64'
      )}>
        {/* Logo */}
        <div className="px-4 lg:px-6 py-4 lg:py-6 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-sm relative flex items-center justify-between md:justify-center lg:justify-start min-h-[72px] lg:min-h-[96px]">
          <div className="flex flex-col relative z-10 w-full md:items-center lg:items-start transition-all">
            <p className="hidden lg:block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-[0.2em]">Super Admin</p>
            <div className="flex items-center gap-2.5 justify-start md:justify-center lg:justify-start w-full">
              <Image src="/logo.png" alt="FoodWonderland Logo" width={32} height={32} className="w-7 h-7 lg:w-8 lg:h-8 flex-shrink-0 drop-shadow-sm brightness-110" priority />
              <h1 className="block md:hidden lg:block text-xl font-extrabold text-white tracking-tight truncate">
                Admin Panel
              </h1>
            </div>
          </div>
          {/* Mobile close */}
          <button onClick={() => setSidebarOpen(false)} className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors flex-shrink-0 relative z-20">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto hide-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  'flex items-center gap-3.5 px-3 lg:px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative overflow-hidden',
                  active ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50',
                  'md:justify-center lg:justify-start'
                )}
              >
                {active && <div className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl" />}
                <Icon className={cn("w-6 h-6 lg:w-5 lg:h-5 transition-colors relative z-10 flex-shrink-0", active ? "text-primary" : "text-slate-500 group-hover:text-slate-300")} />
                <span className="block md:hidden lg:block relative z-10 truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 lg:p-4 border-t border-slate-800/80 bg-slate-900/30">
          <button
            onClick={handleLogout}
            title="ออกจากระบบ"
            className="flex items-center gap-2.5 w-full px-3 lg:px-4 py-3 rounded-xl text-sm font-bold text-slate-400 border border-transparent hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all group md:justify-center lg:justify-start"
          >
            <LogOut className="w-6 h-6 lg:w-4 lg:h-4 group-hover:-translate-x-1 transition-transform flex-shrink-0" />
            <span className="block md:hidden lg:block truncate">ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 md:ml-20 lg:ml-64 min-h-screen flex flex-col transition-all duration-300">
        {/* Mobile Top Bar */}
        <header className="sticky top-0 z-30 md:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between h-14 px-4">
            <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-90">
              <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </button>
            <div className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              <span className="font-bold text-slate-800 dark:text-white">Admin Panel</span>
            </div>
            <div className="w-10" />
          </div>
        </header>

        <main className="flex-1 min-h-screen pb-10">
          <div className="max-w-[1600px] w-full mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
