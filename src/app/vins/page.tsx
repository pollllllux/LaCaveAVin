"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Wine, Search, ArrowLeft, Loader2, ChevronRight, Filter } from 'lucide-react'

export default function GlobalWineList() {
  const [wines, setWines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchGlobalWines()
  }, [])

  async function fetchGlobalWines() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data, error } = await supabase
        .from('wines')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true }) // Tri alphabétique (Spec 16)

      if (data) setWines(data)
      if (error) console.error('Erreur fetch vins:', error.message)
    }
    setLoading(false)
  }

  // Filtrage en temps réel pour la recherche
  const filteredWines = wines.filter(wine => 
    wine.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <div className="h-screen flex items-center justify-center text-bordeaux italic"><Loader2 className="animate-spin mr-2"/> Lecture du grand livre...</div>

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-24">
      {/* Header avec Barre de recherche */}
      <header className="max-w-md mx-auto space-y-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="p-3 bg-white rounded-2xl shadow-sm text-stone-400">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-serif font-bold text-stone-800 italic">Ma Collection</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-4 text-stone-300" size={20} />
          <input 
            type="text"
            placeholder="Rechercher un domaine..."
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-sm border-none outline-none focus:ring-2 focus:ring-bordeaux/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* Liste des vins */}
      <div className="max-w-md mx-auto space-y-3">
        {filteredWines.length > 0 ? (
          filteredWines.map((wine) => (
            <div 
              key={wine.id}
              className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4 active:scale-[0.98] transition-all group"
            >
              {/* Badge Couleur */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 
                ${wine.color === 'red' ? 'bg-bordeaux/10 text-bordeaux' : 
                  wine.color === 'white' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-500'}`}>
                <Wine size={24} />
              </div>

              {/* Infos */}
              <div className="flex-1">
                <h3 className="font-bold text-stone-800 leading-tight">{wine.name}</h3>
                <p className="text-[10px] text-stone-400 uppercase font-bold tracking-widest">
                  {wine.vintage} • {wine.is_1859_classified ? 'Classé 1859' : 'Standard'}
                </p>
                <p className="text-[9px] text-bordeaux italic mt-1 font-medium">
                  {wine.country || wine.region || wine.appellation || 'Infos manquantes'}
                </p>
              </div>

              <ChevronRight size={18} className="text-stone-200 group-hover:text-bordeaux transition-colors" />
            </div>
          ))
        ) : (
          <div className="text-center py-20">
            <p className="text-stone-300 italic">Aucun flacon trouvé...</p>
          </div>
        )}
      </div>

      {/* Bouton de retour rapide flottant */}
      <button 
        onClick={() => router.push('/')}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 bg-stone-800 text-white rounded-full shadow-2xl font-bold flex items-center gap-2 text-sm z-50 active:scale-95 transition-all"
      >
        Retour au menu
      </button>
    </div>
  )
}

