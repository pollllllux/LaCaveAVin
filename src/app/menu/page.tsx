"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home, Wine, BarChart3, LayoutGrid, LogOut, Trash2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'

export default function MenuPage() {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Récupérer tous les IDs de casiers du user
      const { data: cellars } = await supabase
        .from('cellars')
        .select('id')
        .eq('user_id', user.id)

      if (cellars && cellars.length > 0) {
        const cellarIds = cellars.map(c => c.id)

        const { data: units } = await supabase
          .from('storage_units')
          .select('id')
          .in('cellar_id', cellarIds)

        if (units && units.length > 0) {
          const unitIds = units.map(u => u.id)

          const { data: bottles } = await supabase
            .from('bottles')
            .select('id')
            .in('storage_unit_id', unitIds)

          // 2. Supprimer l'historique de consommation
          if (bottles && bottles.length > 0) {
            const bottleIds = bottles.map(b => b.id)
            await supabase
              .from('consumption_history')
              .delete()
              .in('bottle_id', bottleIds)
          }
        }

        // 3. Supprimer les caves (cascade → storage_units → bottles)
        await supabase.from('cellars').delete().in('id', cellarIds)
      }

      // 4. Supprimer tous les vins du user
      await supabase.from('wines').delete().eq('user_id', user.id)

      router.push('/')
    } catch (err) {
      console.error('Erreur reset compte:', err)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-24">
      <div className="max-w-md mx-auto space-y-8">
        <header className="text-center space-y-4">
          <div className="inline-flex p-4 rounded-full bg-bordeaux/10 text-bordeaux mx-auto">
            <LayoutGrid size={36} />
          </div>
          <div>
            <h1 className="text-4xl font-serif font-bold text-stone-800 italic">Menu</h1>
            <p className="text-stone-500">Navigation rapide vers votre cave, vos bouteilles et vos statistiques.</p>
          </div>
        </header>

        <div className="grid gap-4">
          <Link href="/" className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100 transition hover:-translate-y-0.5">
            <span className="p-3 rounded-2xl bg-stone-50 text-bordeaux"><Home size={24} /></span>
            <div>
              <h2 className="font-bold text-stone-800">Ma Cave</h2>
              <p className="text-sm text-stone-400">Voir vos caves et casiers</p>
            </div>
          </Link>

          <Link href="/vins" className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100 transition hover:-translate-y-0.5">
            <span className="p-3 rounded-2xl bg-stone-50 text-bordeaux"><Wine size={24} /></span>
            <div>
              <h2 className="font-bold text-stone-800">Mes Bouteilles</h2>
              <p className="text-sm text-stone-400">Parcourir votre collection</p>
            </div>
          </Link>

          <Link href="/stats" className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100 transition hover:-translate-y-0.5">
            <span className="p-3 rounded-2xl bg-stone-50 text-bordeaux"><BarChart3 size={24} /></span>
            <div>
              <h2 className="font-bold text-stone-800">Statistiques</h2>
              <p className="text-sm text-stone-400">Analyser votre cave</p>
            </div>
          </Link>

          <button
            onClick={() => { setShowConfirm(true); setConfirmText('') }}
            className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100 transition hover:-translate-y-0.5 w-full text-left"
          >
            <span className="p-3 rounded-2xl bg-orange-50 text-orange-400"><Trash2 size={24} /></span>
            <div>
              <h2 className="font-bold text-orange-500">Réinitialiser le compte</h2>
              <p className="text-sm text-stone-400">Effacer toutes les données de la cave</p>
            </div>
          </button>

          <button onClick={handleLogout} className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100 transition hover:-translate-y-0.5 w-full text-left">
            <span className="p-3 rounded-2xl bg-red-50 text-red-400"><LogOut size={24} /></span>
            <div>
              <h2 className="font-bold text-red-400">Se déconnecter</h2>
              <p className="text-sm text-stone-400">Retourner à la page de connexion</p>
            </div>
          </button>
        </div>
      </div>

      {/* Modal de confirmation reset */}
      {showConfirm && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-4 rounded-full bg-orange-50 text-orange-400">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-2xl font-serif font-bold text-stone-800 italic">Réinitialiser ?</h2>
              <p className="text-sm text-stone-500">
                Cette action est <span className="font-bold text-orange-500">irréversible</span>. Toutes vos caves, casiers, bouteilles, fiches vins et historique seront définitivement supprimés.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-stone-400 ml-1">
                Tapez <span className="text-orange-500">RESET</span> pour confirmer
              </label>
              <input
                className="w-full p-4 bg-stone-50 rounded-2xl border-2 border-transparent focus:border-orange-300 outline-none text-center font-bold tracking-widest uppercase"
                placeholder="RESET"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value.toUpperCase())}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-4 text-stone-400 font-bold"
              >
                Annuler
              </button>
              <button
                onClick={handleReset}
                disabled={confirmText !== 'RESET' || resetting}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all ${
                  confirmText === 'RESET' && !resetting
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 active:scale-95'
                    : 'bg-stone-100 text-stone-300 cursor-not-allowed'
                }`}
              >
                {resetting ? 'Suppression...' : 'Réinitialiser'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
