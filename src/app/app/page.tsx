"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Plus, Wine, LayoutGrid, Trash2, Loader2, LogOut, ChevronDown } from 'lucide-react'
import { useDisplayDensity } from '@/hooks/useDisplayDensity'
import { fetchUserSettings, syncSettingsToLocalStorage } from '@/lib/settings-service'

export default function HomePage() {
  const { spacing } = useDisplayDensity()
  const [cellars, setCellars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newCellar, setNewCellar] = useState({ name: '', width: 6, height: 4, type: 'classic', units: 1 })
  const [user, setUser] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [creating, setCreating] = useState(false)
  const [expandedCellar, setExpandedCellar] = useState<string | null>(null)
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

    if (data) setCellars(data)
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

        {/* Accordéons des Caves */}
        <div className={`${spacing.cardGap}`}>
          {cellars.length > 0 ? cellars.map((cellar) => {
            const isExpanded = expandedCellar === cellar.id
            const storageUnits = cellar.storage_units || []

            return (
              <div key={cellar.id} className="bg-white rounded-[2rem] shadow-sm border border-stone-100 overflow-hidden">

                {/* En-tête accordéon */}
                <div
                  onClick={() => setExpandedCellar(isExpanded ? null : cellar.id)}
                  className={`w-full ${spacing.cardPadding} flex justify-between items-center hover:bg-stone-50 transition-colors group cursor-pointer`}
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="p-3 bg-stone-50 rounded-2xl text-bordeaux group-hover:bg-bordeaux group-hover:text-white transition-colors">
                      <LayoutGrid size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-800 text-lg">{cellar.name}</h3>
                      <p className="text-[10px] text-stone-400 uppercase font-bold">
                        {storageUnits.length} casier{storageUnits.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {e.stopPropagation(); setShowAddUnitModal(cellar.id)}}
                      className="p-2 text-stone-200 hover:text-bordeaux hover:bg-stone-100 rounded-lg transition-colors"
                      title="Ajouter un casier"
                    >
                      <Plus size={18} />
                    </button>
                    <button
                      onClick={(e) => deleteCellar(cellar.id, e)}
                      className="p-2 text-stone-200 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                    <ChevronDown
                      size={20}
                      className={`text-stone-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>

                {/* Contenu accordéon - Casiers */}
                {isExpanded && (
                  <div className="border-t border-stone-100 px-6 py-4 bg-stone-50 space-y-2">
                    {storageUnits.length > 0 ? (
                      storageUnits.map((unit, unitIndex) => (
                        <button
                          key={unit.id}
                          onClick={() => router.push(`/cave/${cellar.id}?unit=${unitIndex}`)}
                          className="w-full p-4 bg-white rounded-xl border border-stone-200 text-left hover:border-bordeaux hover:shadow-md transition-all active:scale-[0.98]"
                        >
                          <p className="font-semibold text-stone-800 text-sm">{unit.name}</p>
                          <p className="text-[10px] text-stone-400 mt-1">
                            {unit.width}×{unit.height} • Cliquez pour voir la grille
                          </p>
                        </button>
                      ))
                    ) : (
                      <p className="text-center text-stone-400 italic py-4">Aucun casier dans cette cave.</p>
                    )}
                  </div>
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
