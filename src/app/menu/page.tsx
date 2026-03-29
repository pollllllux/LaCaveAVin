"use client"

import Link from 'next/link'
import { Home, Wine, BarChart3, LayoutGrid } from 'lucide-react'

export default function MenuPage() {
  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-24">
      <div className="max-w-md mx-auto space-y-8">
        <header className="text-center space-y-4">
          <div className="inline-flex p-4 rounded-full bg-bordeaux/10 text-bordeaux mx-auto">
            <LayoutGrid size={36} />
          </div>
          <div>
            <h1 className="text-4xl font-serif font-bold text-stone-800 italic">Menu</h1>
            <p className="text-stone-500">Navigation rapide vers votre cave, vos bouteilles et vos statistiques.</p>
          </div>
        </header>

        <div className="grid gap-4">
          <Link href="/" className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100 transition hover:-translate-y-0.5">
            <span className="p-3 rounded-2xl bg-stone-50 text-bordeaux"><Home size={24} /></span>
            <div>
              <h2 className="font-bold text-stone-800">Ma Cave</h2>
              <p className="text-sm text-stone-400">Voir vos caves et casiers</p>
            </div>
          </Link>

          <Link href="/vins" className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100 transition hover:-translate-y-0.5">
            <span className="p-3 rounded-2xl bg-stone-50 text-bordeaux"><Wine size={24} /></span>
            <div>
              <h2 className="font-bold text-stone-800">Mes Bouteilles</h2>
              <p className="text-sm text-stone-400">Parcourir votre collection</p>
            </div>
          </Link>

          <Link href="/stats" className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100 transition hover:-translate-y-0.5">
            <span className="p-3 rounded-2xl bg-stone-50 text-bordeaux"><BarChart3 size={24} /></span>
            <div>
              <h2 className="font-bold text-stone-800">Statistiques</h2>
              <p className="text-sm text-stone-400">Analyser votre cave</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
