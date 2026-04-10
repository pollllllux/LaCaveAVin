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
  const [consumptionData, setConsumptionData] = useState<Array<{ period: string; entered: number; exited: number }>>([])
  const [timeUnit, setTimeUnit] = useState<'month' | 'year'>('month')
  const [displayYear, setDisplayYear] = useState(new Date().getFullYear())
  const [displayYearStart, setDisplayYearStart] = useState(new Date().getFullYear() - 2)
  const router = useRouter()

  useEffect(() => {
    fetchStats()
  }, [filterMode, timeUnit, displayYear, displayYearStart])

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

      // Récupérer les données si en mode "consumed"
      if (filterMode === 'consumed') {
        // 1. Récupérer les bouteilles créées (entrées) de l'utilisateur seulement
        const { data: bottles } = await supabase
          .from('bottles')
          .select('created_at, wine_id')
          .in('wine_id', allWines.map(w => w.id))

        // 2. Récupérer l'historique complet (sorties)
        const { data: history } = await supabase
          .from('consumption_history')
          .select('consumed_date')

        // Grouper les entrées (création de bouteilles) par mois ou année
        const entered: Record<string, number> = {}
        if (bottles) {
          for (const bottle of bottles) {
            if (bottle.created_at) {
              const date = new Date(bottle.created_at)
              const period = timeUnit === 'month'
                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                : `${date.getFullYear()}`
              entered[period] = (entered[period] || 0) + 1
            }
          }
        }

        // Grouper les sorties par mois ou année
        const exited: Record<string, number> = {}
        if (history) {
          for (const entry of history) {
            if (entry.consumed_date) {
              const date = new Date(entry.consumed_date)
              const period = timeUnit === 'month'
                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                : `${date.getFullYear()}`
              exited[period] = (exited[period] || 0) + 1
            }
          }
        }

        if (bottles || history) {

          // Si en mode mois, générer 12 mois à partir de displayYear
          if (timeUnit === 'month') {
            const months12: Array<{ period: string; entered: number; exited: number }> = []
            for (let i = 0; i < 12; i++) {
              const date = new Date(displayYear, i, 1)
              const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
              months12.push({
                period,
                entered: entered[period] || 0,
                exited: exited[period] || 0
              })
            }
            setConsumptionData(months12)
          } else {
            // Générer 5 années à partir de displayYearStart
            const years5: Array<{ period: string; entered: number; exited: number }> = []
            for (let i = 0; i < 5; i++) {
              const year = displayYearStart + i
              const period = `${year}`
              years5.push({
                period,
                entered: entered[period] || 0,
                exited: exited[period] || 0
              })
            }
            setConsumptionData(years5)
          }
        }
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
      <header className="max-w-md mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4 shrink-0">
          <button onClick={() => router.push('/')} className="p-3 bg-white rounded-2xl shadow-sm text-stone-400">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-800 italic">Statistiques</h1>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setFilterMode('cellar')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-2xl text-sm font-bold transition-all ${
              filterMode === 'cellar'
                ? 'bg-bordeaux text-white shadow-lg shadow-bordeaux/20'
                : 'bg-white text-stone-700 border border-stone-200 hover:border-bordeaux'
            }`}
          >
            Cave
          </button>
          <button
            onClick={() => setFilterMode('consumed')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-2xl text-sm font-bold transition-all ${
              filterMode === 'consumed'
                ? 'bg-bordeaux text-white shadow-lg shadow-bordeaux/20'
                : 'bg-white text-stone-700 border border-stone-200 hover:border-bordeaux'
            }`}
          >
            Historique
          </button>
        </div>
      </header>

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

        {/* Alerte Apogée - uniquement en mode Cave */}
        {filterMode === 'cellar' && (
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
        )}

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

        {/* Histogramme de consommation - uniquement en mode Historique */}
        {filterMode === 'consumed' && consumptionData.length > 0 && (
          <div className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
              <div className="flex items-center gap-2 md:gap-3">
                <h3 className="text-sm font-bold text-stone-700 uppercase tracking-widest whitespace-nowrap">Consommation</h3>
                {timeUnit === 'month' && (
                  <div className="flex items-center gap-1 md:gap-2">
                    <button
                      onClick={() => setDisplayYear(displayYear - 1)}
                      className="p-1 rounded text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all text-sm"
                      title="Année précédente"
                    >
                      ←
                    </button>
                    <span className="text-xs font-bold text-stone-600 w-10 md:w-12 text-center">{displayYear}</span>
                    <button
                      onClick={() => setDisplayYear(displayYear + 1)}
                      className="p-1 rounded text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all text-sm"
                      title="Année suivante"
                    >
                      →
                    </button>
                  </div>
                )}
                {timeUnit === 'year' && (
                  <div className="flex items-center gap-1 md:gap-2">
                    <button
                      onClick={() => setDisplayYearStart(displayYearStart - 5)}
                      className="p-1 rounded text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all text-sm"
                      title="5 années précédentes"
                    >
                      ←
                    </button>
                    <span className="text-xs font-bold text-stone-600 whitespace-nowrap">
                      {displayYearStart}–{displayYearStart + 4}
                    </span>
                    <button
                      onClick={() => setDisplayYearStart(displayYearStart + 5)}
                      className="p-1 rounded text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all text-sm"
                      title="5 années suivantes"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-2 ml-auto md:ml-0">
                <button
                  onClick={() => setTimeUnit('month')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    timeUnit === 'month'
                      ? 'bg-bordeaux text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Mois
                </button>
                <button
                  onClick={() => setTimeUnit('year')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    timeUnit === 'year'
                      ? 'bg-bordeaux text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Année
                </button>
              </div>
            </div>

            {/* Graphique en barres empilées */}
            <div className="space-y-3">
              {(() => {
                const maxCount = Math.max(...consumptionData.map(d => d.entered + d.exited), 1)
                const chartHeight = 150

                // Calculer le stock cumulatif pour chaque période
                let cumulativeStock = 0
                const stockData = consumptionData.map(d => {
                  cumulativeStock += d.entered - d.exited
                  return { period: d.period, stock: Math.max(0, cumulativeStock) }
                })

                // Trouver le stock max pour normaliser l'affichage
                const maxStock = Math.max(...stockData.map(d => d.stock), 1)

                // Filtrer les données pour le passé et le présent seulement
                const now = new Date()
                const currentYear = now.getFullYear()
                const currentMonth = now.getMonth() + 1
                const stockDataFiltered = stockData.filter((d, idx) => {
                  if (timeUnit === 'month') {
                    const [year, month] = d.period.split('-').map(Number)
                    return year < currentYear || (year === currentYear && month <= currentMonth)
                  } else {
                    const year = parseInt(d.period)
                    return year <= currentYear
                  }
                })

                // Générer le chemin SVG de la courbe lissée (spline cubique)
                const generateCurvePath = () => {
                  if (stockDataFiltered.length === 0) return ''

                  const points = stockDataFiltered.map((d, idx) => {
                    const x = ((idx + 0.5) / consumptionData.length) * 100
                    const stockHeight = (d.stock / maxStock) * chartHeight
                    const y = chartHeight - stockHeight
                    return { x, y, xPercent: x }
                  })

                  if (points.length === 1) {
                    return `M ${points[0].xPercent}% ${points[0].y}px`
                  }

                  let path = `M ${points[0].xPercent}% ${points[0].y}px`

                  for (let i = 0; i < points.length - 1; i++) {
                    const p0 = points[i]
                    const p1 = points[i + 1]
                    const p2 = points[i + 2] || p1
                    const p_1 = i > 0 ? points[i - 1] : p0

                    // Contrôle des points pour spline cubique
                    const cp1x = p0.xPercent + (p1.xPercent - p_1.xPercent) / 6
                    const cp1y = p0.y + (p1.y - p_1.y) / 6
                    const cp2x = p1.xPercent - (p2.xPercent - p0.xPercent) / 6
                    const cp2y = p1.y - (p2.y - p0.y) / 6

                    path += ` C ${cp1x}% ${cp1y}px, ${cp2x}% ${cp2y}px, ${p1.xPercent}% ${p1.y}px`
                  }

                  return path
                }

                return (
                  <>
                    {/* Graphique symétrique autour d'un axe central */}
                    <div className="px-2 relative" style={{ height: `${chartHeight * 2 + 4}px` }}>
                      {/* SVG pour la courbe de stock */}
                      <svg
                        className="absolute inset-0 w-full pointer-events-none"
                        style={{ height: `${chartHeight * 2 + 4}px` }}
                        preserveAspectRatio="none"
                      >
                        {/* Courbe lissée du stock */}
                        <path
                          d={generateCurvePath()}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>

                      <div className="flex justify-between gap-2 relative z-10">
                        {consumptionData.map((data) => {
                          const enteredHeight = (data.entered / maxCount) * chartHeight
                          const exitedHeight = (data.exited / maxCount) * chartHeight

                          return (
                            <div key={data.period} className="flex-1 relative" style={{ height: `${chartHeight * 2 + 4}px` }}>
                              {/* Colonne verte (au-dessus de l'axe) */}
                              {data.entered > 0 && (
                                <div
                                  className="absolute left-1/2 -translate-x-1/2 w-4/5 bg-gradient-to-t from-green-500 to-green-400 transition-all hover:from-green-600 cursor-pointer rounded-t"
                                  title={`${data.period}: ${data.entered} entrée${data.entered > 1 ? 's' : ''}`}
                                  style={{
                                    height: `${enteredHeight}px`,
                                    bottom: `${chartHeight + 2}px`
                                  }}
                                />
                              )}

                              {/* Axe continu (2px) */}
                              <div className="absolute w-full border-t-2 border-stone-300" style={{ top: `${chartHeight}px` }}></div>

                              {/* Colonne rouge (en-dessous de l'axe) */}
                              {data.exited > 0 && (
                                <div
                                  className="absolute left-1/2 -translate-x-1/2 w-4/5 bg-gradient-to-b from-red-500 to-red-400 transition-all hover:from-red-600 cursor-pointer rounded-b"
                                  title={`${data.period}: ${data.exited} sortie${data.exited > 1 ? 's' : ''}`}
                                  style={{
                                    height: `${exitedHeight}px`,
                                    top: `${chartHeight + 2}px`
                                  }}
                                />
                              )}

                              {/* Label */}
                              <span className="absolute text-[10px] font-bold text-stone-600 text-center truncate w-full" style={{ bottom: '-20px', left: 0, right: 0 }}>
                                {timeUnit === 'month' ? data.period.slice(5) : data.period}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Espace pour les labels */}
                    <div style={{ height: '24px' }}></div>

                    {/* Légende */}
                    <div className="flex gap-4 justify-center text-[10px] font-bold pt-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span className="text-stone-600">Entrées</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span className="text-stone-600">Sorties</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-stone-600">Stock</span>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[10px]">
              <div className="flex gap-6">
                <div>
                  <span className="text-stone-400">Entrées totales:</span>
                  <span className="font-bold text-stone-700 ml-1">{consumptionData.reduce((sum, d) => sum + d.entered, 0)}</span>
                </div>
                <div>
                  <span className="text-stone-400">Sorties totales:</span>
                  <span className="font-bold text-stone-700 ml-1">{consumptionData.reduce((sum, d) => sum + d.exited, 0)}</span>
                </div>
              </div>
            </div>
          </div>
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
