import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchUserSettings, syncSettingsToLocalStorage } from '@/lib/settings-service'

const DEFAULT_TIMEOUT = 5 // minutes
const WARNING_OFFSET = 1 * 60 * 1000 // 1 minute before timeout

export function useInactivityTimeout() {
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [timeoutMinutes, setTimeoutMinutes] = useState(DEFAULT_TIMEOUT)
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

    // Use state timeout duration
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

  // Vérifier l'authentification au montage et charger les settings
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)

      if (user) {
        // Load timeout setting from DB
        const settings = await fetchUserSettings()
        setTimeoutMinutes(settings.timeout_duration)
        syncSettingsToLocalStorage(settings)
      }
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
  }, [isAuthenticated, router, timeoutMinutes])

  return { showWarning, handleStayConnected }
}
