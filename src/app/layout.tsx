"use client"

import { usePathname } from 'next/navigation'
import { Home, Wine, BarChart3, Menu } from 'lucide-react'
import Link from 'next/link'
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout'
import InactivityWarning from '@/components/InactivityWarning'
import "./globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { showWarning, handleStayConnected } = useInactivityTimeout()

  // Liste des pages où l'on masque la navigation et le timeout (Login, Inscription, etc.)
  const hideNav = pathname === '/login' || pathname === '/auth/callback'
  const disableTimeout = hideNav

  return (
    <html lang="fr">
      <body className="antialiased bg-stone-50 text-stone-900 font-sans">
        {/* Conteneur principal avec padding en bas pour ne pas être caché par la nav */}
        <main className={`min-h-screen ${!hideNav ? 'pb-24' : ''}`}>
          {children}
        </main>

        {/* Alerte d'inactivité */}
        {!disableTimeout && <InactivityWarning show={showWarning} onStayConnected={handleStayConnected} />}

        {/* Barre de navigation basse - Affichée conditionnellement */}
        {!hideNav && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-stone-100 px-6 py-3 z-50">
            <div className="max-w-md mx-auto flex justify-around items-center">
              <Link href="/" className={`flex flex-col items-center gap-1 ${pathname === '/' ? 'text-bordeaux' : 'text-stone-400'}`}>
                <Home size={22} />
                <span className="text-[10px] uppercase font-bold tracking-tighter">Cave</span>
              </Link>

              <Link href="/vins" className={`flex flex-col items-center gap-1 ${pathname === '/vins' ? 'text-bordeaux' : 'text-stone-400'}`}>
                <Wine size={22} />
                <span className="text-[10px] uppercase font-bold tracking-tighter">Vins</span>
              </Link>

              <Link href="/stats" className={`flex flex-col items-center gap-1 ${pathname === '/stats' ? 'text-bordeaux' : 'text-stone-400'}`}>
                <BarChart3 size={22} />
                <span className="text-[10px] uppercase font-bold tracking-tighter">Stats</span>
              </Link>

              <Link href="/menu" className={`flex flex-col items-center gap-1 ${pathname === '/menu' ? 'text-bordeaux' : 'text-stone-400'}`}>
                <Menu size={22} />
                <span className="text-[10px] uppercase font-bold tracking-tighter">Menu</span>
              </Link>
            </div>
          </nav>
        )}
      </body>
    </html>
  )
}

