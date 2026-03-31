"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Plus, Wine, LayoutGrid, Trash2, Loader2, Settings2, LogOut } from 'lucide-react'

export default function HomePage() {
  const [cellars, setCellars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newCellar, setNewCellar] = useState({ name: '', width: 6, height: 4, type: 'classic', units: 1 })
  const [user, setUser] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const maxCellarsReached = cellars.length >= 3

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
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

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-24">
      <div className="max-w-md mx-auto space-y-8">
        
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
          <p className="text-xs text-red-500 uppercase tracking-[0.2em] font-bold mt-2">Limite de 3 caves atteinte. Supprimez une cave pour en ajouter une autre.</p>
        )}

        {/* Liste des Caves */}
        <div className="grid gap-4">
          {cellars.length > 0 ? cellars.map((cellar) => (
            <div 
              key={cellar.id}
              onClick={() => router.push(`/cave/${cellar.id}`)}
              className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100 flex justify-between items-center group cursor-pointer active:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-stone-50 rounded-2xl text-bordeaux group-hover:bg-bordeaux group-hover:text-white transition-colors">
                  <LayoutGrid size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-stone-800 text-lg">{cellar.name}</h3>
                  <p className="text-[10px] text-stone-400 uppercase font-bold">
                    {cellar.storage_units?.[0]?.width}x{cellar.storage_units?.[0]?.height} • {cellar.storage_units?.[0]?.name}
                  </p>
                </div>
              </div>
              <button 
                onClick={(e) => deleteCellar(cellar.id, e)}
                className="p-2 text-stone-200 hover:text-red-400 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )) : (
            <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-[2rem]">
              <Wine className="mx-auto text-stone-200 mb-4" size={48} />
              <p className="text-stone-400 italic">Aucune cave enregistrée.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CRÉATION (Spec 9) */}
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
                    onChange={e => setNewCellar({...newCellar, units: Math.min(5, Math.max(1, parseInt(e.target.value) || 1))})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-stone-400 ml-2">Colonnes (X)</label>
                  <input 
                    type="number"
                    className="w-full p-4 bg-stone-50 rounded-2xl border-none outline-none"
                    value={newCellar.width}
                    onChange={e => setNewCellar({...newCellar, width: parseInt(e.target.value) || 1})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-stone-400 ml-2">Rangées (Y)</label>
                  <input 
                    type="number"
                    className="w-full p-4 bg-stone-50 rounded-2xl border-none outline-none"
                    value={newCellar.height}
                    onChange={e => setNewCellar({...newCellar, height: parseInt(e.target.value) || 1})}
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
                className={`flex-1 py-4 rounded-2xl font-bold shadow-lg shadow-bordeaux/20 active:scale-95 transition-all ${creating ? 'bg-stone-300 text-stone-400 cursor-not-allowed' : 'bg-bordeaux text-white'}`}
              >
                {creating ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

