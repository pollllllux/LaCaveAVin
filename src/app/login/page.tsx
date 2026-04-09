"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Wine, Mail, Lock, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const router = useRouter()

  // Vérifier si l'utilisateur est déjà connecté
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession()
      if (data?.session?.user) router.push('/')
    }
    checkUser()
  }, [router])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Utiliser NEXT_PUBLIC_APP_URL si disponible, sinon window.location.origin
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: appUrl }
      })
      if (error) alert(error.message)
      else alert("Compte créé ! Vérifiez vos emails pour confirmer (si activé dans Supabase).")
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert(error.message)
      else window.location.href = '/'
    }
    setLoading(false)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResetMessage('')

    // Utiliser NEXT_PUBLIC_APP_URL si disponible, sinon window.location.origin
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    })

    if (error) {
      setResetMessage(`Erreur: ${error.message}`)
    } else {
      setResetMessage('Email de réinitialisation envoyé ! Vérifiez votre boîte de réception.')
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
          <p className="text-stone-500 text-sm">Gérez votre collection avec élégance</p>
        </div>

        {/* Formulaire */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-stone-200/50 border border-stone-100">
          {isForgotPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <h2 className="text-xl font-bold text-stone-800 mb-4">Réinitialiser le mot de passe</h2>
              <div className="relative">
                <Mail className="absolute left-4 top-4 text-stone-400" size={20} />
                <input
                  type="email"
                  placeholder="Votre email"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-bordeaux/20 outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {resetMessage && (
                <p className={`text-sm text-center ${resetMessage.includes('Erreur') ? 'text-red-600' : 'text-green-600'}`}>
                  {resetMessage}
                </p>
              )}

              <button
                disabled={loading || resetMessage.includes('envoyé')}
                className="w-full py-4 bg-bordeaux text-white rounded-2xl font-bold shadow-lg shadow-bordeaux/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Envoyer le lien"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-4 text-stone-400" size={20} />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-bordeaux/20 outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-4 text-stone-400" size={20} />
                <input
                  type="password"
                  placeholder="Mot de passe"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-bordeaux/20 outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                disabled={loading}
                className="w-full py-4 bg-bordeaux text-white rounded-2xl font-bold shadow-lg shadow-bordeaux/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? "Créer mon compte" : "Se connecter")}
              </button>
            </form>
          )}

          <div className="mt-6 text-center space-y-2">
            {!isForgotPassword && (
              <button
                onClick={() => setIsForgotPassword(true)}
                className="block w-full text-sm text-stone-500 hover:text-bordeaux font-medium underline underline-offset-4"
              >
                Mot de passe oublié ?
              </button>
            )}
            {!isSignUp && !isForgotPassword && (
              <button
                onClick={() => setIsSignUp(true)}
                className="block w-full text-sm text-stone-500 hover:text-bordeaux font-medium underline underline-offset-4"
              >
                Pas encore de compte ? Inscrivez-vous
              </button>
            )}
            {isSignUp && (
              <button
                onClick={() => setIsSignUp(false)}
                className="block w-full text-sm text-stone-500 hover:text-bordeaux font-medium underline underline-offset-4"
              >
                Déjà un compte ? Connectez-vous
              </button>
            )}
            {isForgotPassword && (
              <button
                onClick={() => {
                  setIsForgotPassword(false)
                  setResetMessage('')
                }}
                className="block w-full text-sm text-stone-500 hover:text-bordeaux font-medium underline underline-offset-4"
              >
                Retour à la connexion
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-stone-400 uppercase tracking-widest">
          Secured by Supabase & Next.js
        </p>
      </div>
    </div>
  )
}

