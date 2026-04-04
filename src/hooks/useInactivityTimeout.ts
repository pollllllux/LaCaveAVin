import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const DEFAULT_TIMEOUT = 5 // minutes
const WARNING_OFFSET = 1 * 60 * 1000 // 1 minute before timeout

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

    // Get timeout duration from localStorage (default 5 minutes)
    const savedTimeout = localStorage.getItem('timeoutDuration')
    const timeoutMinutes = savedTimeout ? parseInt(savedTimeout) : DEFAULT_TIMEOUT
    const inactivityTime = timeoutMinutes * 60 * 1000
    const warningTime = inactivityTime - WARNING_OFFSET

    // Timer d'avertissement : déclenché 1 minute avant le timeout
    warningTimer.current = setTimeout(() => {
      setShowWarning(true)
    }, warningTime)

    // Timer de logout : déclenché après la durée configurée
    inactivityTimer.current = setTimeout(() => {
      logout()
    }, inactivityTime)
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
