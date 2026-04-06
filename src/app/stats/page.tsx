"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BarChart3, ArrowLeft, Loader2, Wine, Globe, MapPin, Euro } from 'lucide-react'
import { capitalize } from '@/lib/format'

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
  const [filterMode, setFilterMode] = useState<'cellar' | 'consumed'>('cellar')
  const router = useRouter()

  useEffect(() => {
    fetchStats()
  }, [filterMode])

  async function fetchStats() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Récupérer les vins de l'utilisateur
      const { data: allWines } = await supabase
        .from('wines')
        .select('*')
        .eq('user_id', user.id)

      if (!allWines) {
        setWines([])
        setLoading(false)
        return
      }

      // Récupérer les bouteilles filtrées par status
      let bottlesQuery = supabase
        .from('bottles')
        .select('wine_id, status')

      if (filterMode === 'cellar') {
        bottlesQuery = bottlesQuery.eq('status', 'in_stock')
      } else {
        bottlesQuery = bottlesQuery.neq('status', 'in_stock')
      }

      const { data: bottles } = await bottlesQuery

      if (bottles) {
        // Créer un set de wine_ids qui ont au moins une bouteille avec le bon status
        const wineIdsInStatus = new Set(bottles.map(b => b.wine_id))

        // Filtrer les vins pour ne garder que ceux qui ont des bouteilles avec le bon status
        const filteredWines = allWines.filter(w => wineIdsInStatus.has(w.id))
        setWines(filteredWines)
      } else {
        setWines([])
      }
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

  const totalValue = wines.reduce((sum, w) => sum + (w.price || 0), 0)
  const mostExpensive = wines.filter(w => w.price > 0).sort((a, b) => b.price - a.price)[0] ?? null

  const formatPrice = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

  // Helper pour construire les URLs vers /vins avec le bon mode
  const getVinsUrl = (params: string) => {
    const modeParam = filterMode === 'consumed' ? '&mode=consumed' : ''
    return `/vins?${params}${modeParam}`
  }

  if (loading) return <div className="h-screen flex items-center justify-center text-bordeaux italic"><Loader2 className="animate-spin mr-2"/> Calcul des indicateurs...</div>

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-24">
      <header className="max-w-md mx-auto flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/')} className="p-3 bg-white rounded-2xl shadow-sm text-stone-400">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-3xl font-serif font-bold text-stone-800 italic">Analytique</h1>
      </header>

      {/* Filtres Cave / Historique */}
      <div className="max-w-md mx-auto flex gap-3 mb-8">
        <button
          onClick={() => setFilterMode('cellar')}
          className={`flex-1 py-3 rounded-2xl font-bold transition-all ${
            filterMode === 'cellar'
              ? 'bg-bordeaux text-white shadow-lg shadow-bordeaux/20'
              : 'bg-white text-stone-700 border border-stone-200 hover:border-bordeaux'
          }`}
        >
          Cave
        </button>
        <button
          onClick={() => setFilterMode('consumed')}
          className={`flex-1 py-3 rounded-2xl font-bold transition-all ${
            filterMode === 'consumed'
              ? 'bg-bordeaux text-white shadow-lg shadow-bordeaux/20'
              : 'bg-white text-stone-700 border border-stone-200 hover:border-bordeaux'
          }`}
        >
          Historique
        </button>
      </div>

      <div className="max-w-md mx-auto space-y-6">

        {/* Carte Score Total */}
        <div className="bg-bordeaux p-8 rounded-[2.5rem] text-white shadow-xl shadow-bordeaux/20 relative overflow-hidden">
          <Wine className="absolute -right-4 -bottom-4 opacity-10 w-32 h-32 rotate-12" />
          <p className="text-xs uppercase tracking-[0.2em] font-bold opacity-70">
            {filterMode === 'cellar' ? 'En Cave' : 'Historique'}
          </p>
          <h2 className="text-6xl font-serif font-bold mt-2">{total}</h2>
          <p className="text-sm mt-4 italic opacity-90">
            {filterMode === 'cellar' ? 'Flacons en stock' : 'Flacons consommés/offerts'}
          </p>
        </div>

        {/* Grille couleurs */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Rouges" value={reds} color="bg-red-100 text-red-800" onClick={() => router.push(getVinsUrl('color=red'))} />
          <StatCard label="Blancs" value={whites} color="bg-amber-100 text-amber-800" onClick={() => router.push(getVinsUrl('color=white'))} />
          <StatCard label="Rosés" value={roses} color="bg-rose-100 text-rose-800" onClick={() => router.push(getVinsUrl('color=rose'))} />
        </div>

        {/* Alerte Apogée */}
        <button
          onClick={() => router.push(getVinsUrl('maturity=ready'))}
          className="w-full bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm flex items-center gap-6 hover:shadow-md hover:border-bordeaux/30 transition-all active:scale-[0.98]"
        >
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
            <BarChart3 size={28} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-stone-800 leading-tight">Prêt à déguster</h3>
            <p className="text-xs text-stone-400 mt-1">
              <span className="text-amber-600 font-bold">{readyToDrink}</span> vins arrivent à apogée en {currentYear} ou {currentYear+1}.
            </p>
          </div>
        </button>

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
            <button
              onClick={() => router.push(getVinsUrl('color=red'))}
              className="flex items-center gap-1 hover:text-bordeaux transition-colors active:scale-95"
            >
              <div className="w-2 h-2 rounded-full bg-bordeaux"></div> {redPercent}% Rouges
            </button>
            <button
              onClick={() => router.push(getVinsUrl('color=white'))}
              className="flex items-center gap-1 hover:text-amber-600 transition-colors active:scale-95"
            >
              <div className="w-2 h-2 rounded-full bg-amber-400"></div> {whitePercent}% Blancs
            </button>
            <button
              onClick={() => router.push(getVinsUrl('color=rose'))}
              className="flex items-center gap-1 hover:text-rose-600 transition-colors active:scale-95"
            >
              <div className="w-2 h-2 rounded-full bg-rose-400"></div> {rosePercent}% Rosés
            </button>
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
          onItemClick={(region) => router.push(getVinsUrl(`region=${encodeURIComponent(region)}`))}
        />

        {/* Valeur totale de la cave */}
        {totalValue > 0 && (
          <div className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm flex items-center gap-6">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
              <Euro size={28} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Valeur de la cave</p>
              <p className="text-2xl font-serif font-bold text-stone-800 mt-1">{formatPrice(totalValue)}</p>
              <p className="text-[10px] text-stone-400 mt-0.5">basée sur les prix d'achat</p>
            </div>
          </div>
        )}

        {/* Bouteille la plus chère */}
        {mostExpensive && (
          <button
            onClick={() => router.push(getVinsUrl(`wine_id=${mostExpensive.id}`))}
            className="w-full bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm space-y-3 hover:shadow-md hover:border-emerald-300/50 transition-all active:scale-[0.98] text-left"
          >
            <div className="flex items-center gap-2 text-stone-700">
              <span className="text-amber-500"><Wine size={18} /></span>
              <h3 className="text-sm font-bold uppercase tracking-widest">Bouteille la plus chère</h3>
            </div>
            <div className="flex items-center gap-4">
              {mostExpensive.image_url ? (
                <img src={mostExpensive.image_url} alt={mostExpensive.name} className="w-14 h-14 object-cover rounded-2xl shrink-0" />
              ) : (
                <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center shrink-0">
                  <Wine size={24} className="text-stone-300" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-stone-800 truncate">{capitalize(mostExpensive.name) || 'Sans nom'}</p>
                <p className="text-xs text-stone-400 truncate">
                  {[capitalize(mostExpensive.appellation || mostExpensive.region), mostExpensive.vintage].filter(Boolean).join(' · ')}
                </p>
                <p className="text-lg font-serif font-bold text-emerald-600 mt-1">{formatPrice(mostExpensive.price)}</p>
              </div>
            </div>
          </button>
        )}

      </div>
    </div>
  )
}

function StatCard({ label, value, color, onClick }: { label: string; value: number; color: string; onClick?: () => void }) {
  const Component = onClick ? 'button' : 'div'
  const className = `p-4 rounded-3xl flex flex-col items-center justify-center ${color} ${onClick ? 'hover:shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer' : ''}`

  return (
    <Component onClick={onClick} className={className}>
      <span className="text-xl font-bold">{value}</span>
      <span className="text-[9px] uppercase font-bold tracking-tighter opacity-70">{label}</span>
    </Component>
  )
}

function BreakdownCard({
  title, icon, items, total, emptyMsg, onItemClick
}: {
  title: string
  icon: React.ReactNode
  items: { label: string; count: number }[]
  total: number
  emptyMsg: string
  onItemClick?: (label: string) => void
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
            const content = (
              <>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-stone-700 truncate max-w-[60%]">{capitalize(label)}</span>
                  <span className="text-stone-400 font-bold shrink-0">{count} · {pct}%</span>
                </div>
                <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-bordeaux rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </>
            )

            return onItemClick ? (
              <button
                key={label}
                onClick={() => onItemClick(label)}
                className="w-full text-left hover:opacity-70 transition-opacity active:scale-[0.98]"
              >
                {content}
              </button>
            ) : (
              <div key={label}>
                {content}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
