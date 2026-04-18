"use client"

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { loadBatch } from '@/hooks/useBatchImport'
import { supabase } from '@/lib/supabase'

interface ImportStatus {
  isProcessing: boolean
  totalItems: number
  completedItems: number
  errorItems: number
  currentItemId: string | null
}

const STORAGE_KEY = 'batchImportStatus'

export default function BatchImportBadge() {
  const [status, setStatus] = useState<ImportStatus>({
    isProcessing: false,
    totalItems: 0,
    completedItems: 0,
    errorItems: 0,
    currentItemId: null,
  })
  const [showCompleted, setShowCompleted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Charger le statut initial depuis localStorage et la BD
    const loadStatus = async () => {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)

          // Récupérer les données réelles de la BD
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const allItems = await loadBatch(user.id)
            const pendingCount = allItems.filter(i => i.status === 'pending').length
            const doneCount = allItems.filter(i => i.status === 'done').length
            const errorCount = allItems.filter(i => i.status === 'error').length

            const totalProcessed = doneCount + errorCount

            if (pendingCount === 0) {
              // Aucun item pending, réinitialiser
              const resetStatus = {
                isProcessing: false,
                totalItems: 0,
                completedItems: 0,
                errorItems: 0,
                currentItemId: null,
              }
              setStatus(resetStatus)
              localStorage.setItem(STORAGE_KEY, JSON.stringify(resetStatus))
            } else {
              // Mettre à jour les compteurs à partir de la BD
              const updatedStatus = {
                ...parsed,
                totalItems: pendingCount + totalProcessed,
                completedItems: doneCount,
                errorItems: errorCount,
              }
              setStatus(updatedStatus)
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStatus))
            }
          }
        } catch (e) {
          console.error('Erreur parsing batch import status:', e)
        }
      }
    }

    loadStatus()

    // Écouter les changements localStorage et mettre à jour les compteurs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setStatus(JSON.parse(e.newValue))
        } catch (err) {
          console.error('Erreur parsing storage change:', err)
        }
      }
    }

    // Mettre à jour tous les 500ms en lisant la BD
    const interval = setInterval(loadStatus, 500)

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  // Afficher le checkmark vert qui clignote pendant 5 secondes après la fin
  useEffect(() => {
    if (!status.isProcessing && status.totalItems > 0 && !showCompleted) {
      setShowCompleted(true)
      const timer = setTimeout(() => setShowCompleted(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [status.isProcessing, status.totalItems, showCompleted])

  // Ne rien afficher si pas d'import en cours et pas de completion à afficher
  if (!status.isProcessing && !showCompleted) {
    return null
  }

  const isProcessing = status.isProcessing && status.totalItems > 0

  return (
    <button
      onClick={() => router.push('/batch-import')}
      title={isProcessing ? `Import en cours: ${status.completedItems}/${status.totalItems}` : 'Import terminé'}
      className="fixed top-6 right-6 z-40 transition-all active:scale-90"
    >
      {isProcessing ? (
        <div className="relative">
          <Loader2 size={24} className="text-bordeaux animate-spin" />
          {/* Pulse de clignotement */}
          <div className="absolute inset-0 animate-pulse">
            <Loader2 size={24} className="text-bordeaux opacity-30" />
          </div>
        </div>
      ) : (
        <CheckCircle2 size={24} className="text-green-600 animate-pulse" />
      )}
    </button>
  )
}
