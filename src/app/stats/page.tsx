"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BarChart3, ArrowLeft, Loader2, Wine, Globe, MapPin } from 'lucide-react'

function groupAndSort(wines: any[], key: string): { label: string; count: number }[] {
  const map: Record<string, number> = {}
  for (const w of wines) {
    const val = w[key]
    if (val) map[val] = (map[val] || 0) + 1
  }
  return Object.entries(map)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

export default function StatsPage() {
  const [wines, setWines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('wines').select('*').eq('user_id', user.id)
      if (data) setWines(data)
    }
    setLoading(false)
  }

  const total = wines.length
  const reds = wines.filter(w => w.color === 'red').length
  const whites = wines.filter(w => w.color === 'white').length
  const roses = wines.filter(w => w.color === 'rose').length
  const redPercent = total > 0 ? Math.round((reds / total) * 100) : 0
  const whitePercent = total > 0 ? Math.round((whites / total) * 100) : 0
  const rosePercent = total > 0 ? Math.round((roses / total) * 100) : 0

  const currentYear = new Date().getFullYear()
  const readyToDrink = wines.filter(w => w.peak_date && w.peak_date <= currentYear + 1).length

  const byCountry = groupAndSort(wines, 'country')
  const byRegion = groupAndSort(wines, 'region')

  if (loading) return <div className="h-screen flex items-center justify-center text-bordeaux italic"><Loader2 className="animate-spin mr-2"/> Calcul des indicateurs...</div>

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-24">
      <header className="max-w-md mx-auto flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/')} className="p-3 bg-white rounded-2xl shadow-sm text-stone-400">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-3xl font-serif font-bold text-stone-800 italic">Analytique</h1>
      </header>

      <div className="max-w-md mx-auto space-y-6">

        {/* Carte Score Total */}
        <div className="bg-bordeaux p-8 rounded-[2.5rem] text-white shadow-xl shadow-bordeaux/20 relative overflow-hidden">
          <Wine className="absolute -right-4 -bottom-4 opacity-10 w-32 h-32 rotate-12" />
          <p className="text-xs uppercase tracking-[0.2em] font-bold opacity-70">Total Collection</p>
          <h2 className="text-6xl font-serif font-bold mt-2">{total}</h2>
          <p className="text-sm mt-4 italic opacity-90">Flacons enregistrés</p>
        </div>

        {/* Grille couleurs */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Rouges" value={reds} color="bg-red-100 text-red-800" />
          <StatCard label="Blancs" value={whites} color="bg-amber-100 text-amber-800" />
          <StatCard label="Rosés" value={roses} color="bg-rose-100 text-rose-800" />
        </div>

        {/* Alerte Apogée */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm flex items-center gap-6">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
            <BarChart3 size={28} />
          </div>
          <div>
            <h3 className="font-bold text-stone-800 leading-tight">Prêt à déguster</h3>
            <p className="text-xs text-stone-400 mt-1">
              <span className="text-amber-600 font-bold">{readyToDrink}</span> vins arrivent à apogée en {currentYear} ou {currentYear+1}.
            </p>
          </div>
        </div>

        {/* Barre de répartition couleurs */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="text-sm font-bold text-stone-700 uppercase tracking-widest">Répartition</h3>
            <span className="text-[10px] text-stone-400">Pourcentage (%)</span>
          </div>
          <div className="h-4 w-full bg-stone-100 rounded-full flex overflow-hidden">
            <div style={{ width: `${redPercent}%` }} className="bg-bordeaux" title="Rouges"></div>
            <div style={{ width: `${whitePercent}%` }} className="bg-amber-400" title="Blancs"></div>
            <div style={{ width: `${rosePercent}%` }} className="bg-rose-400" title="Rosés"></div>
          </div>
          <div className="flex gap-4 text-[9px] font-bold uppercase text-stone-400">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-bordeaux"></div> {redPercent}% Rouges</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div> {whitePercent}% Blancs</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-400"></div> {rosePercent}% Rosés</div>
          </div>
        </div>

        {/* Par Pays */}
        <BreakdownCard
          title="Par Pays"
          icon={<Globe size={18} />}
          items={byCountry}
          total={total}
          emptyMsg="Aucun pays renseigné"
        />

        {/* Par Région */}
        <BreakdownCard
          title="Par Région"
          icon={<MapPin size={18} />}
          items={byRegion}
          total={total}
          emptyMsg="Aucune région renseignée"
        />

      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`p-4 rounded-3xl flex flex-col items-center justify-center ${color}`}>
      <span className="text-xl font-bold">{value}</span>
      <span className="text-[9px] uppercase font-bold tracking-tighter opacity-70">{label}</span>
    </div>
  )
}

function BreakdownCard({
  title, icon, items, total, emptyMsg
}: {
  title: string
  icon: React.ReactNode
  items: { label: string; count: number }[]
  total: number
  emptyMsg: string
}) {
  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-stone-700">
        <span className="text-bordeaux">{icon}</span>
        <h3 className="text-sm font-bold uppercase tracking-widest">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-stone-400 italic">{emptyMsg}</p>
      ) : (
        <div className="space-y-3">
          {items.map(({ label, count }) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            return (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-stone-700 truncate max-w-[60%]">{label}</span>
                  <span className="text-stone-400 font-bold shrink-0">{count} · {pct}%</span>
                </div>
                <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-bordeaux rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
