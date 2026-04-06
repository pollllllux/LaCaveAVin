"use client"

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Wine, Search, ArrowLeft, Loader2, ChevronRight, X } from 'lucide-react'
import { capitalize } from '@/lib/format'
import { useDisplayDensity } from '@/hooks/useDisplayDensity'
import { fetchUserSettings, syncSettingsToLocalStorage } from '@/lib/settings-service'
import { MaturityIconStyled } from '@/components/MaturityIcon'

interface WineWithContext {
  wine: any
  cellar: { id: string; name: string }
  storageUnit: { id: string; name: string }
}

type MaturityType = 'ready' | 'after5' | 'past' | 'unknown'

function getMaturity(peakDate: number | null): MaturityType {
  if (!peakDate) return 'unknown'
  const year = new Date().getFullYear()
  // À boire: ±3 ans autour de la date de maturité
  if (peakDate >= year - 3 && peakDate <= year + 3) return 'ready'
  // Passé depuis plus de 3 ans
  if (peakDate < year - 3) return 'past'
  // Sera prêt dans plus de 3 ans
  return 'after5'
}

const MATURITY_LABELS: Record<MaturityType, { label: string; color: string }> = {
  ready: { label: 'À boire', color: 'bg-green-50 text-green-700 border-green-200' },
  after5: { label: 'À conserver', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  past: { label: 'Passé', color: 'bg-stone-50 text-stone-600 border-stone-200' },
  unknown: { label: 'Inconnu', color: 'bg-stone-50 text-stone-500 border-stone-200' },
}

function GlobalWineListContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { spacing } = useDisplayDensity()

  // Affiche les étoiles avec précision 0.5 (demi-étoile possible)
  const renderStarsWithHalf = (rating: number) => {
    return [1, 2, 3, 4, 5].map(i => {
      if (rating >= i) {
        // Étoile pleine
        return <span key={i} className="text-amber-400">★</span>
      } else if (rating > i - 1) {
        // Demi-étoile avec gradient
        return (
          <span
            key={i}
            className="text-stone-300 relative"
            style={{
              background: 'linear-gradient(90deg, #fbbf24 50%, #d4d4d8 50%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            ★
          </span>
        )
      } else {
        // Étoile grise
        return <span key={i} className="text-stone-300">★</span>
      }
    })
  }

  const [winesList, setWinesList] = useState<WineWithContext[]>([])
  const [allWinesList, setAllWinesList] = useState<WineWithContext[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState<'cellar' | 'consumed'>(searchParams.get('mode') === 'consumed' ? 'consumed' : 'cellar')
  const [consumptionHistory, setConsumptionHistory] = useState<any[]>([])
  const [selectedReviews, setSelectedReviews] = useState<any[]>([])
  const [showReviewsModal, setShowReviewsModal] = useState(false)
  const [selectedVintageForReviews, setSelectedVintageForReviews] = useState<{ wineId: string; vintage: number } | null>(null)
  const [filters, setFilters] = useState({
    cellarId: '',
    storageUnitId: '',
    color: searchParams.get('color') || '',
    maturity: searchParams.get('maturity') || '',
    country: '',
    region: searchParams.get('region') || '',
    appellation: '',
    search: '',
    wineId: searchParams.get('wine_id') || '',
  })

  const [selectingCellar, setSelectingCellar] = useState<{ wine: any; vintage: number; cellars: Array<{ id: string; name: string }> } | null>(null)

  useEffect(() => {
    // Load settings from DB on mount
    fetchUserSettings().then(settings => {
      syncSettingsToLocalStorage(settings)
    })

    fetchWinesWithContext()
  }, [filterMode])

  const handleVintageClick = async (wine: any, vintage: number) => {
    // Find all bottles of this wine/vintage
    const bottlesOfVintage = winesList.filter(w => w.wine.id === wine.id && w.wine.vintage === vintage)
    const cellarsSet = new Set(bottlesOfVintage.map(b => b.cellar.id))
    const uniqueCellars = Array.from(cellarsSet).map(cellarId => {
      const cellar = bottlesOfVintage.find(b => b.cellar.id === cellarId)?.cellar
      return cellar!
    })

    // If only one cellar, navigate directly
    if (uniqueCellars.length === 1) {
      router.push(`/cave/${uniqueCellars[0].id}?highlight=${wine.id}:${vintage}`)
    } else {
      // Otherwise, show modal to choose cellar
      setSelectingCellar({ wine, vintage, cellars: uniqueCellars })
    }
  }

  async function fetchWinesWithContext() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    // Fetch wines directement
    const { data: winesData, error: winesError } = await supabase
      .from('wines')
      .select('*')
      .eq('user_id', user.id)

    if (winesError) {
      console.error('Erreur fetch wines:', winesError.message)
      setLoading(false)
      return
    }

    if (!winesData || winesData.length === 0) {
      console.log('Aucun vin trouvé pour cet utilisateur')
      setLoading(false)
      return
    }

    // Fetch bottles avec storage_units et cellars - TOUS LES STATUTS
    const { data: bottlesData, error: bottlesError } = await supabase
      .from('bottles')
      .select(`
        wine_id,
        status,
        storage_unit_id,
        storage_units(*)
      `)

    if (bottlesError) {
      console.error('Erreur fetch bottles:', bottlesError.message)
      setLoading(false)
      return
    }

    if (!bottlesData || bottlesData.length === 0) {
      console.log('Aucune bouteille trouvée')
      setLoading(false)
      return
    }

    // Fetch cellars pour l'utilisateur
    const { data: cellarsData, error: cellarsError } = await supabase
      .from('cellars')
      .select('*')
      .eq('user_id', user.id)

    if (cellarsError) {
      console.error('Erreur fetch cellars:', cellarsError.message)
      setLoading(false)
      return
    }

    const cellarsMap = new Map((cellarsData || []).map(c => [c.id, c]))

    // Merger wines avec context - filtrer par mode
    const seen = new Set<string>()
    const wines = bottlesData
      .filter(bottle => {
        if (filterMode === 'cellar') {
          return bottle.status === 'in_stock'
        } else {
          return bottle.status !== 'in_stock'
        }
      })
      .map(bottle => {
        const wine = winesData.find(w => w.id === bottle.wine_id)
        const unit = bottle.storage_units
        const cellar = unit ? cellarsMap.get(unit.cellar_id) : null

        return wine && unit && cellar
          ? {
              wine,
              cellar: { id: cellar.id, name: cellar.name },
              storageUnit: { id: unit.id, name: unit.name },
            }
          : null
      })
      .filter(item => item !== null && !seen.has(item!.wine.id))
      .map(item => {
        seen.add(item!.wine.id)
        return item!
      })
      .sort((a, b) => a.wine.name.localeCompare(b.wine.name))

    console.log('✅ Vins chargés:', wines.length, wines)
    setWinesList(wines)

    // Charger l'historique de consommation si en mode "Historique"
    if (filterMode === 'consumed' && user) {
      const { data: history } = await supabase
        .from('consumption_history')
        .select('*')

      const { data: bottleData } = await supabase
        .from('bottles')
        .select('id, wine_id')

      // Charger TOUS les vins de l'utilisateur pour enrichissement
      const { data: allUserWines } = await supabase
        .from('wines')
        .select('*')
        .eq('user_id', user.id)

      // Enrichir l'historique
      const enrichedHistory = history?.map(h => {
        const bottle = bottleData?.find(b => b.id === h.bottle_id)
        const wine = allUserWines?.find(w => w.id === bottle?.wine_id)
        return {
          ...h,
          bottles: {
            wine_id: bottle?.wine_id,
            wines: { vintage: wine?.vintage }
          }
        }
      }) || []

      setConsumptionHistory(enrichedHistory)
    }

    setLoading(false)
  }

  // ---- Listes uniques pour les filtres ----
  const cellars = Array.from(
    new Map(
      winesList.map(w => [w.cellar.id, w.cellar])
    ).values()
  )

  const storageUnitsForCellar = filters.cellarId
    ? Array.from(
        new Map(
          winesList
            .filter(w => w.cellar.id === filters.cellarId)
            .map(w => [w.storageUnit.id, w.storageUnit])
        ).values()
      )
    : []

  const countries = Array.from(new Set(winesList.map(w => w.wine.country).filter(Boolean))).sort()
  const regionsForCountry = filters.country
    ? Array.from(new Set(
        winesList
          .filter(w => w.wine.country === filters.country)
          .map(w => w.wine.region)
          .filter(Boolean)
      )).sort()
    : []

  const appellationsForRegion = filters.region
    ? Array.from(new Set(
        winesList
          .filter(w => w.wine.region === filters.region)
          .map(w => w.wine.appellation)
          .filter(Boolean)
      )).sort()
    : []

  // ---- Filtrage cumulatif ----
  const filteredWines = winesList.filter(w => {
    const wine = w.wine

    // Filtre vin spécifique (par ID)
    if (filters.wineId && wine.id !== filters.wineId) return false

    // Filtre cave
    if (filters.cellarId && w.cellar.id !== filters.cellarId) return false

    // Filtre casier
    if (filters.storageUnitId && w.storageUnit.id !== filters.storageUnitId) return false

    // Filtre couleur
    if (filters.color && wine.color !== filters.color) return false

    // Filtre maturité
    if (filters.maturity) {
      const maturity = getMaturity(wine.peak_date)
      if (maturity !== filters.maturity) return false
    }

    // Filtre pays
    if (filters.country && wine.country !== filters.country) return false

    // Filtre région
    if (filters.region && wine.region !== filters.region) return false

    // Filtre appellation
    if (filters.appellation && wine.appellation !== filters.appellation) return false

    // Filtre recherche
    if (filters.search && !wine.name.toLowerCase().includes(filters.search.toLowerCase())) return false

    return true
  })

  // Réinitialiser casier si cave change
  function setCellarId(id: string) {
    setFilters(f => ({ ...f, cellarId: id, storageUnitId: '' }))
  }

  // Réinitialiser région/appellation si pays change
  function setCountry(c: string) {
    setFilters(f => ({ ...f, country: c, region: '', appellation: '' }))
  }

  // Réinitialiser appellation si région change
  function setRegion(r: string) {
    setFilters(f => ({ ...f, region: r, appellation: '' }))
  }

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => {
    if (k === 'search') return false
    return v !== ''
  })

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-bordeaux italic">
        <Loader2 className="animate-spin mr-2" /> Lecture du grand livre...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      {/* Header */}
      <header className={`max-w-2xl mx-auto space-y-4 mb-6`}>
        <div className="flex items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-3 bg-white rounded-2xl shadow-sm text-stone-400 hover:text-bordeaux transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-3xl font-serif font-bold text-stone-800 italic">Ma Collection</h1>
          </div>

          {/* Filtres Cave / Historique */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterMode('cellar')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                filterMode === 'cellar'
                  ? 'bg-bordeaux text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Cave
            </button>
            <button
              onClick={() => setFilterMode('consumed')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                filterMode === 'consumed'
                  ? 'bg-bordeaux text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Historique
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-4 top-4 text-stone-300" size={20} />
          <input
            type="text"
            placeholder="Rechercher un domaine..."
            className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl shadow-sm border-none outline-none focus:ring-2 focus:ring-bordeaux/20 transition-all text-sm"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>
      </header>

      {/* Filtres */}
      <div className={`max-w-2xl mx-auto ${spacing.sectionGap} mb-6`}>
        {/* Caves */}
        <div>
          <label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">🏠 Caves</label>
          <div className="flex gap-2 flex-wrap">
            {cellars.map(cellar => (
              <button
                key={cellar.id}
                onClick={() => setCellarId(cellar.id === filters.cellarId ? '' : cellar.id)}
                className={`px-4 py-2 rounded-full text-sm transition-all border ${
                  filters.cellarId === cellar.id
                    ? 'bg-bordeaux text-white border-bordeaux'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-bordeaux'
                }`}
              >
                {cellar.name}
              </button>
            ))}
          </div>
        </div>

        {/* Casiers */}
        {storageUnitsForCellar.length > 0 && (
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">📦 Casiers</label>
            <div className="flex gap-2 flex-wrap">
              {storageUnitsForCellar.map(unit => (
                <button
                  key={unit.id}
                  onClick={() => setFilters(f => ({ ...f, storageUnitId: unit.id === f.storageUnitId ? '' : unit.id }))}
                  className={`px-4 py-2 rounded-full text-sm transition-all border ${
                    filters.storageUnitId === unit.id
                      ? 'bg-bordeaux text-white border-bordeaux'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-bordeaux'
                  }`}
                >
                  {unit.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Couleur */}
        <div>
          <label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">🎨 Couleur</label>
          <div className="flex gap-2 flex-wrap">
            {['red', 'white', 'rose'].map(color => (
              <button
                key={color}
                onClick={() => setFilters(f => ({ ...f, color: color === f.color ? '' : color }))}
                className={`px-4 py-2 rounded-full text-sm transition-all border ${
                  filters.color === color
                    ? 'bg-bordeaux text-white border-bordeaux'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-bordeaux'
                }`}
              >
                {color === 'red' ? 'Rouge' : color === 'white' ? 'Blanc' : 'Rosé'}
              </button>
            ))}
          </div>
        </div>

        {/* Maturité */}
        <div>
          <label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">⏰ Maturité</label>
          <div className="flex gap-2 flex-wrap">
            {(['ready', 'after5', 'past'] as MaturityType[]).map(mat => (
              <button
                key={mat}
                onClick={() => setFilters(f => ({ ...f, maturity: mat === f.maturity ? '' : mat }))}
                className={`px-4 py-2 rounded-full text-sm transition-all border ${
                  filters.maturity === mat
                    ? 'bg-bordeaux text-white border-bordeaux'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-bordeaux'
                }`}
              >
                {MATURITY_LABELS[mat].label}
              </button>
            ))}
          </div>
        </div>

        {/* Pays */}
        {countries.length > 0 && (
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">🌍 Pays</label>
            <div className="flex gap-2 flex-wrap max-w-2xl">
              {countries.map(country => (
                <button
                  key={country}
                  onClick={() => setCountry(country === filters.country ? '' : country)}
                  className={`px-3 py-1 rounded-full text-xs transition-all border ${
                    filters.country === country
                      ? 'bg-bordeaux text-white border-bordeaux'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-bordeaux'
                  }`}
                >
                  {capitalize(country)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Région */}
        {regionsForCountry.length > 0 && (
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">📍 Région</label>
            <div className="flex gap-2 flex-wrap max-w-2xl">
              {regionsForCountry.map(region => (
                <button
                  key={region}
                  onClick={() => setRegion(region === filters.region ? '' : region)}
                  className={`px-3 py-1 rounded-full text-xs transition-all border ${
                    filters.region === region
                      ? 'bg-bordeaux text-white border-bordeaux'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-bordeaux'
                  }`}
                >
                  {capitalize(region)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Appellation */}
        {appellationsForRegion.length > 0 && (
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">🏷 Appellation</label>
            <div className="flex gap-2 flex-wrap max-w-2xl">
              {appellationsForRegion.map(appellation => (
                <button
                  key={appellation}
                  onClick={() => setFilters(f => ({ ...f, appellation: appellation === f.appellation ? '' : appellation }))}
                  className={`px-3 py-1 rounded-full text-xs transition-all border ${
                    filters.appellation === appellation
                      ? 'bg-bordeaux text-white border-bordeaux'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-bordeaux'
                  }`}
                >
                  {capitalize(appellation)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bouton effacer filtres */}
        {hasActiveFilters && (
          <button
            onClick={() => setFilters({ cellarId: '', storageUnitId: '', color: '', maturity: '', country: '', region: '', appellation: '', search: '', wineId: '' })}
            className="flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors text-sm font-medium"
          >
            <X size={16} /> Effacer les filtres
          </button>
        )}
      </div>

      {/* Liste des vins - Cards compactes */}
      <div className="max-w-2xl mx-auto">
        {filteredWines.length > 0 ? (() => {
          // Group wines by name only, tracking vintages and counts
          const wineGroups = new Map<string, {
            wine: any
            vintages: Array<{ vintage: number; appellation: string; region: string; country: string; count: number; maturity: MaturityType }>
          }>()

          filteredWines.forEach(w => {
            const key = w.wine.name
            if (!wineGroups.has(key)) {
              wineGroups.set(key, { wine: w.wine, vintages: [] })
            }
            const group = wineGroups.get(key)!
            const existingVintage = group.vintages.find(v => v.vintage === w.wine.vintage)
            if (existingVintage) {
              existingVintage.count += 1
            } else {
              group.vintages.push({
                vintage: w.wine.vintage,
                appellation: w.wine.appellation,
                region: w.wine.region,
                country: w.wine.country,
                count: 1,
                maturity: getMaturity(w.wine.peak_date)
              })
            }
          })

          // Sort vintages by year descending
          wineGroups.forEach(group => {
            group.vintages.sort((a, b) => b.vintage - a.vintage)
          })

          return (
            <div className={`grid grid-cols-1 md:grid-cols-2 ${spacing.cardGap}`}>
              {Array.from(wineGroups.values()).map((group, idx) => {
                const wine = group.wine
                const colorBg =
                  wine.color === 'red' ? 'bg-bordeaux/10 text-bordeaux' : wine.color === 'white' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-500'

                return (
                  <div key={`${wine.name}|${idx}`} className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-88">
                    {/* En-tête avec couleur */}
                    <div className={`flex items-start justify-between ${spacing.cardPadding} border-b border-stone-100 shrink-0`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorBg}`}>
                        <Wine size={20} />
                      </div>
                    </div>

                    {/* Contenu avec scrollable vintages */}
                    <div className={`${spacing.cardPadding} space-y-3 flex flex-col min-h-0 flex-1`}>
                      <h3 className="font-bold text-stone-800">{capitalize(wine.name)}</h3>

                      {/* Vintages list with scrollbar if needed */}
                      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                        {group.vintages.map((v, vIdx) => {
                          const matLabel = MATURITY_LABELS[v.maturity]
                          const isClickable = filterMode === 'cellar'

                          return (
                            <div
                              key={vIdx}
                              onClick={() => isClickable && handleVintageClick(wine, v.vintage)}
                              className={`w-full text-sm pb-2 border-b border-stone-100 last:border-b-0 p-2 -mx-2 rounded text-left transition-colors ${
                                isClickable
                                  ? 'text-stone-600 hover:bg-stone-50 hover:text-stone-800 cursor-pointer'
                                  : 'text-stone-400'
                              }`}
                            >
                              <p className="flex items-center justify-between gap-2">
                                <span className="text-xs truncate flex-1">{v.vintage} • {capitalize(v.appellation || v.region || v.country)}</span>
                                <span className="shrink-0 flex items-center gap-2">
                                  {filterMode === 'consumed' && (() => {
                                    const entriesForVintage = consumptionHistory.filter(h => {
                                      if (!h.bottles) return false
                                      const bottle = h.bottles
                                      const wineInfo = bottle.wines
                                      return bottle.wine_id === wine.id && wineInfo?.vintage === v.vintage
                                    })

                                    if (entriesForVintage.length > 0) {
                                      // Calculer la note moyenne (seulement les entrées bues avec rating)
                                      const ratingsForVintage = entriesForVintage
                                        .filter(h => h.rating !== null && h.reason === 'drunk')
                                        .map(h => h.rating)

                                      const avgRating = ratingsForVintage.length > 0
                                        ? Math.round((ratingsForVintage.reduce((a, b) => a + b, 0) / ratingsForVintage.length) * 2) / 2
                                        : 0

                                      // Vérifier s'il y a des offertes
                                      const hasGifted = entriesForVintage.some(h => h.reason === 'gift')
                                      const hasRating = ratingsForVintage.length > 0

                                      return (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setSelectedReviews(entriesForVintage)
                                            setSelectedVintageForReviews({ wineId: wine.id, vintage: v.vintage })
                                            setShowReviewsModal(true)
                                          }}
                                          className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
                                        >
                                          <div className="flex gap-0.5 text-sm">
                                            {hasRating && renderStarsWithHalf(avgRating)}
                                          </div>
                                          {hasGifted && (
                                            <span className="text-sm">🎁</span>
                                          )}
                                        </button>
                                      )
                                    }
                                    return null
                                  })()}
                                  {filterMode === 'cellar' && <MaturityIconStyled maturity={v.maturity} />}
                                </span>
                              </p>
                              <p className="text-xs text-stone-500 mt-1">
                                <span className="font-semibold text-stone-700">{v.count} bouteille{v.count > 1 ? 's' : ''}</span>
                              </p>
                            </div>
                          )
                        })}
                      </div>

                      {/* Pays et région en bas */}
                      <div className="text-[11px] text-stone-500 mt-2 pt-2 border-t border-stone-100 shrink-0">
                        <p>{capitalize(wine.country)} {wine.region ? `• ${capitalize(wine.region)}` : ''}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })() : (
          <div className="text-center py-20">
            <p className="text-stone-300 italic">Aucun flacon ne correspond à ces critères...</p>
          </div>
        )}
      </div>

      {/* Modal pour afficher les commentaires */}
      {showReviewsModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-serif font-bold text-stone-800 italic">Commentaires de dégustation</h2>

            {selectedReviews.length === 0 ? (
              <p className="text-stone-500 italic">Aucun commentaire</p>
            ) : (
              <div className="space-y-4">
                {selectedReviews.map((review, idx) => (
                  <div key={idx} className="border-l-4 border-bordeaux pl-4 py-2">
                    <div className="flex items-center gap-2 mb-2">
                      {review.reason === 'drunk' && (
                        <div className="flex gap-0.5 text-sm">
                          {renderStarsWithHalf(review.rating || 0)}
                        </div>
                      )}
                      <span className={`text-xs font-bold ${review.reason === 'gift' ? 'text-green-600' : 'text-stone-600'}`}>
                        {review.reason === 'gift' ? '🎁 Offerte' : '🍷 Bue'}
                      </span>
                    </div>
                    {review.review && (
                      <p className="text-sm text-stone-600 italic">{review.review}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowReviewsModal(false)}
              className="w-full py-3 bg-bordeaux text-white rounded-2xl font-bold hover:bg-stone-800 transition-all"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal pour sélectionner le casier */}
      {selectingCellar && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-xl font-serif font-bold text-stone-800 italic">Quel casier?</h2>
            <p className="text-sm text-stone-600">
              {capitalize(selectingCellar.wine.name)} {selectingCellar.vintage} se trouve dans plusieurs casiers.
            </p>
            <div className="space-y-2">
              {selectingCellar.cellars.map(cellar => (
                <button
                  key={cellar.id}
                  onClick={() => {
                    setSelectingCellar(null)
                    router.push(`/cave/${cellar.id}?highlight=${selectingCellar.wine.id}:${selectingCellar.vintage}`)
                  }}
                  className="w-full py-4 bg-stone-50 hover:bg-bordeaux hover:text-white text-stone-800 rounded-2xl font-bold transition-all active:scale-95"
                >
                  {cellar.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectingCellar(null)}
              className="w-full py-2 text-stone-400 font-bold text-sm uppercase tracking-widest hover:text-stone-600 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="h-screen flex items-center justify-center text-bordeaux italic">
      <Loader2 className="animate-spin mr-2" /> Lecture du grand livre...
    </div>
  )
}

export default function GlobalWineList() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GlobalWineListContent />
    </Suspense>
  )
}
