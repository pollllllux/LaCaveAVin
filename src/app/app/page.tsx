"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Plus, Wine, LayoutGrid, Trash2, Loader2, LogOut } from 'lucide-react'
import { useDisplayDensity } from '@/hooks/useDisplayDensity'
import { fetchUserSettings, syncSettingsToLocalStorage } from '@/lib/settings-service'

export default function HomePage() {
  const { spacing } = useDisplayDensity()
  const [cellars, setCellars] = useState<any[]>([])
  const [unitBottles, setUnitBottles] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newCellar, setNewCellar] = useState({ name: '', width: 6, height: 4, type: 'classic', units: 1 })
  const [user, setUser] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showAddUnitModal, setShowAddUnitModal] = useState<string | null>(null)
  const [newUnit, setNewUnit] = useState({ name: '', width: 6, height: 4 })
  const router = useRouter()
  const maxCellarsReached = cellars.length >= 3

  useEffect(() => {
    checkAuth()

    // Load settings from DB on mount
    fetchUserSettings().then(settings => {
      syncSettingsToLocalStorage(settings)
    })
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    setUser(user)
    setAuthChecked(true)
    if (!user) {
      router.push('/login')
      return
    }
    await fetchCellars(user)
  }

  if (!authChecked || loading) return (
    <div className="h-screen flex items-center justify-center bg-stone-50 text-bordeaux italic font-serif">
      <Loader2 className="animate-spin mr-2" /> Chargement...
    </div>
  )

  async function fetchCellars(currentUser?: any) {
    const activeUser = currentUser || user
    if (!activeUser) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('cellars')
      .select('*, storage_units(*)')
      .eq('user_id', activeUser.id)

    if (data) {
      setCellars(data)

      // Récupérer les bouteilles pour tous les casiers
      const bottlesMap: Record<string, any[]> = {}

      for (const cellar of data) {
        for (const unit of cellar.storage_units || []) {
          const { data: bottles, error: bError } = await supabase
            .from('bottles')
            .select('*')
            .eq('storage_unit_id', unit.id)
            .eq('status', 'in_stock')

          if (bError) console.error(`Erreur fetch bouteilles pour ${unit.id}:`, bError.message)

          if (bottles && bottles.length > 0) {
            // Récupérer les infos des vins pour chaque bouteille
            const wineIds = [...new Set(bottles.map(b => b.wine_id))]
            const { data: wines } = await supabase
              .from('wines')
              .select('*')
              .in('id', wineIds)

            const winesMap = (wines || []).reduce((acc: any, w: any) => {
              acc[w.id] = w
              return acc
            }, {})

            bottlesMap[unit.id] = bottles.map(b => ({
              ...b,
              wine: winesMap[b.wine_id]
            }))
          } else {
            bottlesMap[unit.id] = []
          }
        }
      }

      setUnitBottles(bottlesMap)
    }
    if (error) console.error('Erreur fetch caves:', error.message)
    setLoading(false)
  }

  const handleCreateCellar = async () => {
    if (!newCellar.name) {
      alert('Donne un nom à la nouvelle cave.')
      return
    }
    if (!user) {
      alert('Vous devez être connecté pour créer une cave.')
      router.push('/login')
      return
    }

    setCreating(true)
    const { data: cellar, error: cError } = await supabase
      .from('cellars')
      .insert([{ name: newCellar.name, user_id: user.id, type: newCellar.type }])
      .select()
      .single()

    if (cError) {
      console.error('Erreur création cave:', cError.message)
      return
    }

    if (cellar) {
      const count = Math.min(5, Math.max(1, newCellar.units))
      const storageUnits = Array.from({ length: count }, (_, index) => ({
        name: `Casier ${index + 1}`,
        cellar_id: cellar.id,
        width: newCellar.width,
        height: newCellar.height
      }))

      const { error: sError } = await supabase.from('storage_units').insert(storageUnits)
      if (!sError) {
        setNewCellar({ name: '', width: 6, height: 4, type: 'classic', units: 1 })
        setShowModal(false)
        await fetchCellars()
      } else {
        console.error('Erreur création casiers:', sError.message)
      }
    }
    setCreating(false)
  }

  const deleteCellar = async (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (!confirm('Supprimer cette cave et tout son contenu ?')) return
    const { error } = await supabase.from('cellars').delete().eq('id', id)
    if (error) {
      console.error('Erreur suppression cave:', error.message)
      return
    }
    await fetchCellars()
  }

  const handleAddUnit = async (cellarId: string) => {
    if (!newUnit.name) {
      alert('Donne un nom au casier.')
      return
    }

    const { error } = await supabase.from('storage_units').insert([{
      name: newUnit.name,
      cellar_id: cellarId,
      width: newUnit.width,
      height: newUnit.height
    }])

    if (error) {
      console.error('Erreur création casier:', error.message)
      return
    }

    setNewUnit({ name: '', width: 6, height: 4 })
    setShowAddUnitModal(null)
    await fetchCellars()
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-24">
      <div className={`max-w-md mx-auto ${spacing.sectionGap}`}>

        {/* Header */}
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-serif font-bold text-stone-800 italic">Mes Caves</h1>
            <p className="text-stone-400 text-xs uppercase font-bold tracking-widest mt-1">Gestion de Stock</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
              className="p-4 rounded-2xl bg-stone-100 text-stone-400 hover:text-red-400 hover:bg-red-50 active:scale-90 transition-all"
              title="Se déconnecter"
            >
              <LogOut size={20} />
            </button>
            <button
              onClick={() => !maxCellarsReached && setShowModal(true)}
              disabled={maxCellarsReached}
              className={`p-4 rounded-2xl shadow-lg shadow-bordeaux/20 active:scale-90 transition-transform ${maxCellarsReached ? 'bg-stone-300 text-stone-500 cursor-not-allowed' : 'bg-bordeaux text-white'}`}
            >
              <Plus size={24} />
            </button>
          </div>
        </header>
        {maxCellarsReached && (
          <p className="text-xs text-red-500 uppercase tracking-[0.2em] font-bold">Limite de 3 caves atteinte. Supprimez une cave pour en ajouter une autre.</p>
        )}

        {/* Caves avec casiers en lignes avec miniatures */}
        <div className={`${spacing.cardGap}`}>
          {cellars.length > 0 ? cellars.map((cellar) => {
            const storageUnits = cellar.storage_units || []

            return (
              <div key={cellar.id} className="space-y-3">
                {/* En-tête de cave */}
                <div className="flex justify-between items-center px-2">
                  <div>
                    <h3 className="font-bold text-stone-800 text-lg">{cellar.name}</h3>
                    <p className="text-[10px] text-stone-400 uppercase font-bold">
                      {storageUnits.length} casier{storageUnits.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddUnitModal(cellar.id)}
                      className="p-2 text-stone-400 hover:text-bordeaux hover:bg-stone-100 rounded-lg transition-colors"
                      title="Ajouter un casier"
                    >
                      <Plus size={18} />
                    </button>
                    <button
                      onClick={(e) => deleteCellar(cellar.id, e)}
                      className="p-2 text-stone-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Casiers en lignes */}
                {storageUnits.length > 0 ? (
                  <div className="space-y-2">
                    {storageUnits.map((unit: any, unitIndex: number) => {
                      const bottles = unitBottles[unit.id] || []

                      return (
                        <button
                          key={unit.id}
                          onClick={() => router.push(`/cave/${cellar.id}?unit=${unitIndex}`)}
                          className="w-full bg-white rounded-2xl border border-stone-100 overflow-hidden hover:border-bordeaux hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-4 p-4"
                        >
                          {/* Info casier */}
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-stone-800">{unit.name}</p>
                            <p className="text-[10px] text-stone-400 mt-1">
                              {bottles.length} bouteille{bottles.length > 1 ? 's' : ''}
                            </p>
                          </div>

                          {/* Miniature du casier - respecte le ratio */}
                          <div
                            className="rounded-xl p-2 flex-shrink-0 flex flex-col bg-stone-700"
                            style={{
                              aspectRatio: `${unit.width} / ${unit.height}`,
                              width: '140px',
                              minWidth: '140px',
                              background: 'linear-gradient(135deg, #3d2817 0%, #5c4033 20%, #4a3728 50%, #3d2817 80%, #2a1810 100%)',
                            }}
                          >
                            <div
                              className="grid gap-1 flex-1"
                              style={{ gridTemplateColumns: `repeat(${unit.width}, minmax(0, 1fr))` }}
                            >
                              {Array.from({ length: unit.width * unit.height }).map((_, i) => {
                                const x = (i % unit.width) + 1
                                const y = Math.floor(i / unit.width) + 1
                                const bottle = bottles.find(b => b.pos_x === x && b.pos_y === y)
                                const wine = bottle?.wine

                                return (
                                  <div
                                    key={i}
                                    className={`aspect-square rounded-full shadow-md border-2 ${
                                      wine
                                        ? wine.color === 'white'
                                          ? 'bg-yellow-300 border-yellow-500 shadow-yellow-300/50'
                                          : wine.color === 'rose'
                                          ? 'bg-pink-400 border-pink-600 shadow-pink-400/50'
                                          : wine.color === 'red'
                                          ? 'bg-red-600 border-red-800 shadow-red-600/50'
                                          : 'bg-amber-700 border-amber-900 shadow-amber-700/50'
                                        : 'bg-stone-500 border-stone-600 shadow-stone-500/30'
                                    }`}
                                  />
                                )
                              })}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center text-stone-400 italic py-4">Aucun casier dans cette cave</p>
                )}
              </div>
            )
          }) : (
            <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-[2rem]">
              <Wine className="mx-auto text-stone-200 mb-4" size={48} />
              <p className="text-stone-400 italic">Aucune cave enregistrée.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL D'AJOUT DE CASIER */}
      {showAddUnitModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-serif font-bold text-stone-800 italic">Nouveau Casier</h2>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-stone-400 ml-2">Nom du casier</label>
                <input
                  autoFocus
                  className="w-full p-4 bg-stone-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-bordeaux/20"
                  placeholder="Ex: Casier 1..."
                  value={newUnit.name}
                  onChange={e => setNewUnit({...newUnit, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-stone-400 ml-2">Colonnes (X)</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full p-4 bg-stone-50 rounded-2xl border-none outline-none"
                    value={newUnit.width}
                    onChange={e => setNewUnit({...newUnit, width: parseInt(e.target.value) || 0})}
                    onBlur={e => setNewUnit({...newUnit, width: parseInt(e.target.value) || 1})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-stone-400 ml-2">Rangées (Y)</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full p-4 bg-stone-50 rounded-2xl border-none outline-none"
                    value={newUnit.height}
                    onChange={e => setNewUnit({...newUnit, height: parseInt(e.target.value) || 0})}
                    onBlur={e => setNewUnit({...newUnit, height: parseInt(e.target.value) || 1})}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {setShowAddUnitModal(null); setNewUnit({name: '', width: 6, height: 4})}}
                className="flex-1 py-4 text-stone-400 font-bold"
              >
                Annuler
              </button>
              <button
                onClick={() => handleAddUnit(showAddUnitModal)}
                className="flex-1 py-4 bg-bordeaux text-white font-bold rounded-2xl hover:bg-stone-800 active:scale-95 transition-all"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRÉATION DE CAVE */}
      {showModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-serif font-bold text-stone-800 italic">Nouvel Espace</h2>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-stone-400 ml-2">Nom de la cave</label>
                <input
                  autoFocus
                  className="w-full p-4 bg-stone-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-bordeaux/20"
                  placeholder="Ex: Cave Salon, Garage..."
                  value={newCellar.name}
                  onChange={e => setNewCellar({...newCellar, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-stone-400 ml-2">Type de cave</label>
                  <select
                    className="w-full p-4 bg-stone-50 rounded-2xl border-none outline-none"
                    value={newCellar.type}
                    onChange={e => setNewCellar({...newCellar, type: e.target.value})}
                  >
                    <option value="classic">Classique</option>
                    <option value="refrigerated">Réfrigéré</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-stone-400 ml-2">Nombre de casiers</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    className="w-full p-4 bg-stone-50 rounded-2xl border-none outline-none"
                    value={newCellar.units}
                    onChange={e => setNewCellar({...newCellar, units: parseInt(e.target.value) || 0})}
                    onBlur={e => setNewCellar({...newCellar, units: Math.min(5, Math.max(1, parseInt(e.target.value) || 1))})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-stone-400 ml-2">Colonnes (X)</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full p-4 bg-stone-50 rounded-2xl border-none outline-none"
                    value={newCellar.width}
                    onChange={e => setNewCellar({...newCellar, width: parseInt(e.target.value) || 0})}
                    onBlur={e => setNewCellar({...newCellar, width: parseInt(e.target.value) || 1})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-stone-400 ml-2">Rangées (Y)</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full p-4 bg-stone-50 rounded-2xl border-none outline-none"
                    value={newCellar.height}
                    onChange={e => setNewCellar({...newCellar, height: parseInt(e.target.value) || 0})}
                    onBlur={e => setNewCellar({...newCellar, height: parseInt(e.target.value) || 1})}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-4 text-stone-400 font-bold"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateCellar}
                disabled={creating}
                className="flex-1 py-4 bg-bordeaux text-white font-bold rounded-2xl hover:bg-stone-800 active:scale-95 transition-all disabled:opacity-60"
              >
                {creating ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
