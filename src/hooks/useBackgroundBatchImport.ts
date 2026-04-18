"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { BatchItem, loadBatch, updateBatchItem } from '@/hooks/useBatchImport'
import { processBottleImage, searchWineCatalog, verifyAndCorrectWineName, detectClassement1859, REGIONS_BY_COUNTRY, APPELLATIONS_BY_REGION, matchRegionToList, matchAppellationToList } from '@/lib/wine-service'
import { getPeakDate } from '@/lib/wine-peak-dates'

interface ImportStatus {
  isProcessing: boolean
  totalItems: number
  completedItems: number
  errorItems: number
  currentItemId: string | null
}

const STORAGE_KEY = 'batchImportStatus'

export function useBackgroundBatchImport(userId: string | null) {
  const [status, setStatus] = useState<ImportStatus>({
    isProcessing: false,
    totalItems: 0,
    completedItems: 0,
    errorItems: 0,
    currentItemId: null,
  })

  const idleCallbackRef = useRef<number | null>(null)
  const isProcessingRef = useRef(false)

  // Charger le statut depuis localStorage au montage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setStatus(JSON.parse(saved))
      } catch (e) {
        console.error('Erreur parsing batch import status:', e)
      }
    }
  }, [])

  // Sauvegarder le statut quand il change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status))
  }, [status])

  // Traiter un item
  const processItem = useCallback(async (item: BatchItem) => {
    try {
      setStatus(prev => ({ ...prev, currentItemId: item.id }))

      // Fetch l'image depuis storage
      const response = await fetch(item.image_url!)
      const blob = await response.blob()
      const file = new File([blob], 'wine-label.jpg', { type: blob.type })

      // Reconnaissance OCR
      const recognition = await processBottleImage(file)
      let { domaine, cuvee, vintage, appellation, region, country, rawText } = recognition

      // Normaliser région et appellation
      if (country && REGIONS_BY_COUNTRY[country]) {
        region = matchRegionToList(region, country)
        if (region && APPELLATIONS_BY_REGION[region]) {
          appellation = matchAppellationToList(appellation, region)
        }
      }

      // Recherche dans le catalogue
      let finalDomaine = domaine
      let finalCuvee = cuvee
      let hits = await searchWineCatalog(domaine, supabase)

      if (hits.length === 0) {
        const corrected = await verifyAndCorrectWineName(domaine, cuvee, appellation, country, supabase)
        finalDomaine = corrected.domaine || domaine
        finalCuvee = corrected.cuvee || cuvee
        hits = await searchWineCatalog(finalDomaine, supabase)
      }

      const hasClassement = detectClassement1859(rawText, region, appellation)

      // Chercher la date de maturité optimale
      const [peakDateStart, peakDateEnd] = await getPeakDate(country, region, appellation, vintage, supabase, 'normal')

      // Mettre à jour l'item
      await updateBatchItem(item.id, {
        status: 'done',
        name: finalDomaine,
        cuvee: finalCuvee,
        vintage: vintage || null,
        appellation: appellation || '',
        region: region || '',
        country: country || '',
        is_1859: hasClassement,
        peak_date_start: peakDateStart,
        peak_date_end: peakDateEnd,
        vintage_quality: 'normal',
        raw_text: rawText
      })

      setStatus(prev => ({
        ...prev,
        completedItems: prev.completedItems + 1,
        currentItemId: null,
      }))
    } catch (error) {
      console.error(`Erreur traitement item ${item.id}:`, error)
      let errorMessage = 'Erreur lors du traitement'
      if (error instanceof Error) {
        errorMessage = error.message.split('\n')[0].substring(0, 80)
      }

      await updateBatchItem(item.id, {
        status: 'error',
        error_message: errorMessage
      })

      setStatus(prev => ({
        ...prev,
        errorItems: prev.errorItems + 1,
        currentItemId: null,
      }))
    }
  }, [])

  // Démarrer le traitement des items pending
  const startProcessing = useCallback(async () => {
    if (!userId || isProcessingRef.current) return

    isProcessingRef.current = true

    try {
      const allItems = await loadBatch(userId)
      const pendingItems = allItems.filter(i => i.status === 'pending')

      if (pendingItems.length === 0) {
        isProcessingRef.current = false
        return
      }

      // Augmenter totalItems si de nouveaux items sont ajoutés
      setStatus(prev => ({
        ...prev,
        isProcessing: true,
        totalItems: prev.totalItems + pendingItems.length,
      }))

      // Traiter les items avec requestIdleCallback
      let currentIndex = 0

      const processNextInIdle = () => {
        if (currentIndex >= pendingItems.length) {
          isProcessingRef.current = false
          setStatus(prev => ({ ...prev, isProcessing: false, currentItemId: null }))
          return
        }

        const item = pendingItems[currentIndex]
        currentIndex++

        processItem(item).then(() => {
          // Continuer après que requestIdleCallback soit disponible
          if ('requestIdleCallback' in window) {
            idleCallbackRef.current = window.requestIdleCallback(processNextInIdle, { timeout: 2000 })
          } else {
            // Fallback pour navigateurs sans requestIdleCallback
            setTimeout(processNextInIdle, 100)
          }
        })
      }

      // Démarrer le traitement
      if ('requestIdleCallback' in window) {
        idleCallbackRef.current = window.requestIdleCallback(processNextInIdle, { timeout: 2000 })
      } else {
        setTimeout(processNextInIdle, 100)
      }
    } catch (error) {
      console.error('Erreur démarrage batch import:', error)
      isProcessingRef.current = false
      setStatus(prev => ({ ...prev, isProcessing: false }))
    }
  }, [userId, processItem])

  // Cleanup
  useEffect(() => {
    return () => {
      if (idleCallbackRef.current) {
        cancelIdleCallback(idleCallbackRef.current)
      }
    }
  }, [])

  return {
    status,
    startProcessing,
  }
}
