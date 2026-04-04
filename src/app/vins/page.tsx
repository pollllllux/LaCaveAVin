"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Wine, Search, ArrowLeft, Loader2, ChevronRight, X } from 'lucide-react'

interface WineWithContext {
  wine: any
  cellar: { id: string; name: string }
  storageUnit: { id: string; name: string }
}

type MaturityType = 'ready' | 'within5' | 'after5' | 'past' | 'unknown'

function getMaturity(peakDate: number | null): MaturityType {
  if (!peakDate) return 'unknown'
  const year = new Date().getFullYear()
  if (peakDate < year - 2) return 'past'
  if (peakDate <= year + 2) return 'ready'
  if (peakDate <= year + 7) return 'within5'
  return 'after5'
}

const MATURITY_LABELS: Record<MaturityType, { label: string; icon: string; color: string }> = {
  ready: { label: 'Prêt à boire', icon: '🟢', color: 'bg-green-50 text-green-700 border-green-200' },
  within5: { label: 'Dans les 5 ans', icon: '🟡', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  after5: { label: 'Après 5 ans', icon: '🔵', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  past: { label: 'Passé l\'apogée', icon: '⚪', color: 'bg-stone-50 text-stone-600 border-stone-200' },
  unknown: { label: 'Inconnu', icon: '❓', color: 'bg-stone-50 text-stone-500 border-stone-200' },
}

export default function GlobalWineList() {
  const [winesList, setWinesList] = useState<WineWithContext[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    cellarId: '',
    storageUnitId: '',
    color: '',
    maturity: '',
    country: '',
    region: '',
    appellation: '',
    search: '',
  })

  const router = useRouter()

  useEffect(() => {
    fetchWinesWithContext()
  }, [])

  async function fetchWinesWithContext() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    // Approche 1 : Fetch wines directement, puis matcher avec bottles/storage_units
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

    // Fetch bottles avec storage_units et cellars
    const { data: bottlesData, error: bottlesError } = await supabase
      .from('bottles')
      .select(`
        wine_id,
        storage_unit_id,
        storage_units(*)
      `)
      .eq('status', 'in_stock')

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

    // Merger wines avec context
    const seen = new Set<string>()
    const wines = bottlesData
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
    <div className="min-h-screen bg-stone-50 p-6 pb-24">
      {/* Header */}
      <header className="max-w-2xl mx-auto space-y-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="p-3 bg-white rounded-2xl shadow-sm text-stone-400 hover:text-bordeaux transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-serif font-bold text-stone-800 italic">Ma Collection</h1>
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
      <div className="max-w-2xl mx-auto space-y-4 mb-6">
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
            {(['ready', 'within5', 'after5'] as MaturityType[]).map(mat => (
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
                  {country}
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
                  {region}
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
                  {appellation}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bouton effacer filtres */}
        {hasActiveFilters && (
          <button
            onClick={() => setFilters(f => ({ ...f, cellarId: '', storageUnitId: '', color: '', maturity: '', country: '', region: '', appellation: '' }))}
            className="flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors text-sm font-medium"
          >
            <X size={16} /> Effacer les filtres
          </button>
        )}
      </div>

      {/* Liste des vins - Cards compactes */}
      <div className="max-w-2xl mx-auto">
        {filteredWines.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredWines.map(w => {
              const wine = w.wine
              const maturity = getMaturity(wine.peak_date)
              const matLabel = MATURITY_LABELS[maturity]
              const colorBg =
                wine.color === 'red' ? 'bg-bordeaux/10 text-bordeaux' : wine.color === 'white' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-500'

              return (
                <div key={wine.id} className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden hover:shadow-md transition-shadow">
                  {/* En-tête avec couleur et maturité */}
                  <div className="flex items-start justify-between p-4 border-b border-stone-100">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorBg}`}>
                      <Wine size={20} />
                    </div>
                    <div className={`px-2 py-1 rounded-lg border text-xs font-medium ${matLabel.color}`}>
                      {matLabel.icon}
                    </div>
                  </div>

                  {/* Contenu */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-stone-800 line-clamp-2">{wine.name}</h3>
                    <p className="text-sm text-stone-600">{wine.vintage} • {wine.appellation || wine.region || wine.country}</p>
                    <div className="text-[11px] text-stone-500 space-y-1">
                      <p>{wine.country} {wine.region ? `• ${wine.region}` : ''}</p>
                      <p className="text-stone-400">{w.cellar.name} • {w.storageUnit.name}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-stone-300 italic">Aucun flacon ne correspond à ces critères...</p>
          </div>
        )}
      </div>

      {/* Bouton de retour flottant */}
      <button
        onClick={() => router.push('/')}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 bg-stone-800 text-white rounded-full shadow-2xl font-bold flex items-center gap-2 text-sm z-50 active:scale-95 transition-all hover:bg-stone-900"
      >
        Retour au menu
      </button>
    </div>
  )
}
