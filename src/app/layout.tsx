import type { Metadata } from 'next'
import { Kanit } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const kanit = Kanit({ 
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-kanit',
})

export const metadata: Metadata = {
  title: 'FoodWonderland v2',
  description: 'A modern food court ordering system',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={kanit.variable}>
      <body className={`${kanit.className} antialiased selection:bg-primary/30 selection:text-primary relative min-h-screen flex flex-col`}>
        {/* Global Ambient Background */}
        <div className="fixed inset-0 -z-50 h-full w-full bg-slate-50 dark:bg-slate-950">
          <div className="absolute top-0 z-[-1] h-screen w-screen bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(249,115,22,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(249,115,22,0.1),rgba(0,0,0,0))]"></div>
          <div className="absolute bottom-0 right-0 z-[-1] h-[50vh] w-[50vw] bg-[radial-gradient(circle_400px_at_100%_100%,rgba(249,115,22,0.05),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_400px_at_100%_100%,rgba(249,115,22,0.05),rgba(0,0,0,0))]"></div>
        </div>
        
        {children}
        
        <Toaster 
          position="top-center" 
          richColors 
          theme="system"
          duration={2500}
          toastOptions={{
            className: 'font-sans shadow-lg rounded-xl border border-border/50 backdrop-blur-md',
          }}
        />
      </body>
    </html>
  )
}
