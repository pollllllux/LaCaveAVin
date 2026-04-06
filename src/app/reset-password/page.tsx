"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Wine, Lock, Loader2, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Vérifier si l'utilisateur a une session (lien valide)
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data?.session?.user) {
        setMessage('Lien expiré ou invalide. Demandez une nouvelle réinitialisation.')
      }
    }
    checkSession()
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (password !== confirmPassword) {
      setMessage('Les mots de passe ne correspondent pas.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setMessage('Le mot de passe doit contenir au moins 6 caractères.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage(`Erreur: ${error.message}`)
    } else {
      setSuccess(true)
      setMessage('Mot de passe réinitialisé avec succès!')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo & Titre */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 rounded-full bg-bordeaux/10 text-bordeaux mb-2">
            <Wine size={48} />
          </div>
          <h1 className="text-4xl font-serif font-bold text-bordeaux italic">maCaveAVin</h1>
          <p className="text-stone-500 text-sm">Nouveau mot de passe</p>
        </div>

        {/* Formulaire */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-stone-200/50 border border-stone-100">
          {success ? (
            <div className="text-center space-y-4">
              <div className="inline-flex p-4 rounded-full bg-green-100 text-green-600">
                <CheckCircle size={48} />
              </div>
              <h2 className="text-xl font-bold text-stone-800">Succès!</h2>
              <p className="text-stone-600">Votre mot de passe a été réinitialisé.</p>
              <p className="text-sm text-stone-400">Redirection vers la connexion...</p>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-4 top-4 text-stone-400" size={20} />
                <input
                  type="password"
                  placeholder="Nouveau mot de passe"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-bordeaux/20 outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-4 text-stone-400" size={20} />
                <input
                  type="password"
                  placeholder="Confirmer le mot de passe"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-bordeaux/20 outline-none transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {message && (
                <p className={`text-sm text-center ${message.includes('Erreur') ? 'text-red-600' : 'text-stone-600'}`}>
                  {message}
                </p>
              )}

              <button
                disabled={loading}
                className="w-full py-4 bg-bordeaux text-white rounded-2xl font-bold shadow-lg shadow-bordeaux/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Réinitialiser"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[10px] text-stone-400 uppercase tracking-widest">
          Secured by Supabase & Next.js
        </p>
      </div>
    </div>
  )
}
