"use client"

import { useEffect } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Home, Wine, BarChart3, Menu } from 'lucide-react'
import Link from 'next/link'
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout'
import InactivityWarning from '@/components/InactivityWarning'
import BatchImportBadge from '@/components/BatchImportBadge'

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { showWarning, handleStayConnected } = useInactivityTimeout()

  // Liste des pages où l'on masque la navigation et le timeout (Login, Inscription, Landing, etc.)
  const hideNav = pathname === '/login' || pathname === '/auth/callback' || pathname === '/'
  const disableTimeout = hideNav

  return (
    <>
      {/* Conteneur principal avec padding en bas pour ne pas être caché par la nav */}
      <main className={`min-h-screen ${!hideNav ? 'pb-24' : ''}`}>
        {children}
      </main>

      {/* Alerte d'inactivité */}
      {!disableTimeout && <InactivityWarning show={showWarning} onStayConnected={handleStayConnected} />}

      {/* Badge d'import en arrière-plan */}
      <BatchImportBadge />

      {/* Barre de navigation basse - Affichée conditionnellement */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-stone-100 px-6 py-3 z-50">
          <div className="max-w-6xl mx-auto flex justify-between items-center gap-6">
            <Link href="/app" className="flex-shrink-0">
              <Image src="/vintrakfr.png" alt="Vintrak" width={50} height={25} className="md:hidden" />
              <Image src="/vintrakfr.png" alt="Vintrak" width={80} height={40} className="hidden md:block" />
            </Link>

            <div className="flex justify-center items-center gap-8">
              <Link href="/app" className={`flex flex-col items-center gap-1 ${pathname === '/app' ? 'text-bordeaux' : 'text-stone-400'}`}>
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

            <div className="w-20 flex-shrink-0"></div>
          </div>
        </nav>
      )}
    </>
  )
}
