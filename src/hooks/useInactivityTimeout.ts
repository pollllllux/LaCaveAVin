import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const INACTIVITY_TIME = 2 * 60 * 1000 // 2 minutes (pour test)
const WARNING_TIME = 1 * 60 * 1000 // 1 minute (warning avant 1 min)

export function useInactivityTimeout() {
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null)
  const warningTimer = useRef<NodeJS.Timeout | null>(null)

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const resetTimers = () => {
    // Masquer l'alerte si elle était affichée
    setShowWarning(false)

    // Nettoyer les anciens timers
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    if (warningTimer.current) clearTimeout(warningTimer.current)

    // Timer d'avertissement : déclenché après 9 minutes
    warningTimer.current = setTimeout(() => {
      setShowWarning(true)
    }, WARNING_TIME)

    // Timer de logout : déclenché après 10 minutes
    inactivityTimer.current = setTimeout(() => {
      logout()
    }, INACTIVITY_TIME)
  }

  const handleStayConnected = () => {
    resetTimers()
  }

  // Vérifier l'authentification au montage
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }

    checkAuth()
  }, [])

  // Gérer les timers seulement si l'utilisateur est connecté
  useEffect(() => {
    if (!isAuthenticated) {
      // Nettoyer les timers si l'utilisateur se déconnecte
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      if (warningTimer.current) clearTimeout(warningTimer.current)
      setShowWarning(false)
      return
    }

    // Événements qui réinitialisent le timer
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    const handleActivity = () => {
      resetTimers()
    }

    // Ajouter les listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity)
    })

    // Initialiser les timers au montage
    resetTimers()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      if (warningTimer.current) clearTimeout(warningTimer.current)
    }
  }, [isAuthenticated, router])

  return { showWarning, handleStayConnected }
}
