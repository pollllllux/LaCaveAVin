"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Wine, TrendingUp, TrendingDown } from 'lucide-react'

interface WineWithBottles {
  id: string
  name: string
  vintage: number | null
  region: string
  country: string
  color: string
  peak_date_start: number | null
  peak_date_end: number | null
  bottle_count: number
}

export default function ApogeeTimeline() {
  const [wines, setWines] = useState<WineWithBottles[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'nearest_peak' | 'nearest_expire'>('nearest_peak')
  const router = useRouter()
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    fetchWines()
  }, [])

  async function fetchWines() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Récupérer les vins avec dates d'apogée
    const { data: winesData } = await supabase
      .from('wines')
      .select('id, name, vintage, region, country, color, peak_date_start, peak_date_end')
      .eq('user_id', user.id)
      .not('peak_date_start', 'is', null)
      .not('peak_date_end', 'is', null)

    // Récupérer les bouteilles séparément
    const { data: bottlesData } = await supabase
      .from('bottles')
      .select('wine_id')

    if (winesData && bottlesData) {
      console.log('🍷 Vins bruts reçus:', winesData)
      console.log('🍷 Bouteilles reçues:', bottlesData)

      // Compter les bouteilles par vin
      const bottleCountByWine = bottlesData.reduce((acc: any, b: any) => {
        acc[b.wine_id] = (acc[b.wine_id] || 0) + 1
        return acc
      }, {})

      const processed = winesData.map((w: any) => ({
        ...w,
        bottle_count: bottleCountByWine[w.id] || 0,
      }))
      console.log('🍷 Vins traités:', processed)
      const filtered = processed.filter((w: any) => w.bottle_count > 0)
      console.log('🍷 Vins après filtre:', filtered)

      // Trier
      const sorted = sortWines(filtered, sortBy)
      setWines(sorted)
    } else {
      console.log('❌ Pas de winesData ou bottlesData')
    }

    setLoading(false)
  }

  function sortWines(wineList: WineWithBottles[], sort: 'nearest_peak' | 'nearest_expire'): WineWithBottles[] {
    return [...wineList].sort((a, b) => {
      if (sort === 'nearest_peak') {
        // Apogée la plus proche = la date de début la plus proche (mais future de préférence)
        const aDist = a.peak_date_start! <= currentYear ? 0 : a.peak_date_start! - currentYear
        const bDist = b.peak_date_start! <= currentYear ? 0 : b.peak_date_start! - currentYear
        return aDist - bDist
      } else {
        // Péremption la plus proche = la date de fin la plus proche
        const aDist = Math.max(0, a.peak_date_end! - currentYear)
        const bDist = Math.max(0, b.peak_date_end! - currentYear)
        return aDist - bDist
      }
    })
  }

  const handleSortChange = (sort: 'nearest_peak' | 'nearest_expire') => {
    setSortBy(sort)
    setWines(sortWines(wines, sort))
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-stone-50 text-bordeaux">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-serif italic animate-pulse">Chargement des apogées...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-stone-600" />
          </button>
          <div>
            <h1 className="text-4xl font-serif font-bold text-stone-800 italic">Apogées</h1>
            <p className="text-stone-400 text-xs uppercase font-bold tracking-widest mt-1">{wines.length} vins</p>
          </div>
        </div>

        {/* Tri */}
        <div className="flex gap-2">
          <button
            onClick={() => handleSortChange('nearest_peak')}
            className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm uppercase transition-all ${
              sortBy === 'nearest_peak'
                ? 'bg-bordeaux text-white shadow-lg shadow-bordeaux/20'
                : 'bg-white text-stone-700 border border-stone-200'
            }`}
          >
            <TrendingUp size={16} className="inline mr-2" />
            Apogée proche
          </button>
          <button
            onClick={() => handleSortChange('nearest_expire')}
            className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm uppercase transition-all ${
              sortBy === 'nearest_expire'
                ? 'bg-bordeaux text-white shadow-lg shadow-bordeaux/20'
                : 'bg-white text-stone-700 border border-stone-200'
            }`}
          >
            <TrendingDown size={16} className="inline mr-2" />
            Péremption proche
          </button>
        </div>

        {/* Liste des vins */}
        <div className="space-y-4">
          {wines.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-stone-200 rounded-[2.5rem] space-y-4">
              <Wine className="mx-auto text-stone-200" size={48} />
              <p className="text-stone-400 italic">Aucun vin avec apogée définie</p>
            </div>
          ) : (
            wines.map((wine) => <WineTimeline key={wine.id} wine={wine} currentYear={currentYear} />)
          )}
        </div>
      </div>
    </div>
  )
}

function WineTimeline({ wine, currentYear }: { wine: WineWithBottles; currentYear: number }) {
  const startYear = wine.peak_date_start!
  const endYear = wine.peak_date_end!

  // Calculer les positions sur la timeline (en %)
  const minYear = Math.min(currentYear - 2, startYear - 2)
  const maxYear = Math.max(currentYear + 2, endYear + 5)
  const range = maxYear - minYear

  const currentPos = ((currentYear - minYear) / range) * 100
  const startPos = ((startYear - minYear) / range) * 100
  const endPos = ((endYear - minYear) / range) * 100

  // Déterminer la couleur selon l'état
  let statusColor = 'bg-blue-100 text-blue-700'
  let statusLabel = 'À conserver'

  if (currentYear >= startYear && currentYear <= endYear) {
    statusColor = 'bg-green-100 text-green-700'
    statusLabel = 'À boire'
  } else if (currentYear >= endYear - 1) {
    statusColor = 'bg-red-100 text-red-700'
    statusLabel = 'Dernière chance'
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
      {/* Infos vin */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-stone-800 text-lg">{wine.name}</h3>
          <p className="text-sm text-stone-500">{wine.region}, {wine.country} {wine.vintage && `• ${wine.vintage}`}</p>
        </div>
        <div className="text-right">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}>
            {statusLabel}
          </span>
          <p className="text-sm text-stone-500 mt-2">{wine.bottle_count} bouteille{wine.bottle_count > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {/* Valeurs années */}
        <div className="flex justify-between text-[10px] text-stone-400 px-1">
          <span>{minYear}</span>
          <span>{maxYear - 1}</span>
        </div>

        {/* Ligne de timeline */}
        <div className="relative h-12 bg-stone-100 rounded-lg overflow-hidden">
          {/* Barre de la plage */}
          <div
            className="absolute top-1/2 transform -translate-y-1/2 h-6 bg-gradient-to-r from-amber-300 to-amber-400 opacity-40 rounded"
            style={{
              left: `${startPos}%`,
              width: `${Math.max(2, endPos - startPos)}%`,
            }}
          />

          {/* Point de début d'apogée */}
          <div
            className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-20"
            style={{ left: `${startPos}%` }}
          >
            <div className="w-6 h-6 bg-amber-500 rounded-full border-2 border-white shadow-md flex items-center justify-center">
              <div className="w-2 h-2 bg-amber-700 rounded-full" />
            </div>
            <p className="text-[9px] font-bold text-stone-600 mt-1 whitespace-nowrap">{startYear}</p>
          </div>

          {/* Point de fin d'apogée */}
          <div
            className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-20"
            style={{ left: `${endPos}%` }}
          >
            <div className="w-6 h-6 bg-red-400 rounded-full border-2 border-white shadow-md flex items-center justify-center">
              <div className="w-2 h-2 bg-red-700 rounded-full" />
            </div>
            <p className="text-[9px] font-bold text-stone-600 mt-1 whitespace-nowrap">{endYear}</p>
          </div>

          {/* Point année courante */}
          <div
            className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-10"
            style={{ left: `${currentPos}%` }}
          >
            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
          </div>
        </div>

        {/* Légende */}
        <div className="flex gap-4 text-[9px] text-stone-500 px-1 mt-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span>Aujourd'hui</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-500 rounded-full" />
            <span>Début</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-400 rounded-full" />
            <span>Fin</span>
          </div>
        </div>
      </div>

      {/* Infos apogée */}
      <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[9px] text-stone-400 uppercase font-bold">Début</p>
          <p className="text-sm font-bold text-amber-600">{startYear}</p>
        </div>
        <div>
          <p className="text-[9px] text-stone-400 uppercase font-bold">Durée</p>
          <p className="text-sm font-bold text-stone-700">{endYear - startYear + 1} ans</p>
        </div>
        <div>
          <p className="text-[9px] text-stone-400 uppercase font-bold">Fin</p>
          <p className="text-sm font-bold text-red-600">{endYear}</p>
        </div>
      </div>
    </div>
  )
}
