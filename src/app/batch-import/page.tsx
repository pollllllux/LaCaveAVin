"use client"

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Loader2, CheckCircle2, AlertCircle, RotateCcw, Wine, X, Trash2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { processBottleImage, searchWineCatalog, verifyAndCorrectWineName, detectClassement1859, REGIONS_BY_COUNTRY, APPELLATIONS_BY_REGION, matchRegionToList, matchAppellationToList } from '@/lib/wine-service'
import { loadBatch, addBatchItems, updateBatchItem, uploadBatchImage, removeBatchItem, BatchItem } from '@/hooks/useBatchImport'
import { fetchUserSettings } from '@/lib/settings-service'
import { getPeakDate } from '@/lib/wine-peak-dates'
import ImageCropModal from '@/components/ImageCropModal'

const ACCEPTED_FORMATS = ['image/jpeg', 'image/png']
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png']

export default function BatchImportPage() {
  const [user, setUser] = useState<any>(null)
  const [items, setItems] = useState<BatchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [formatErrors, setFormatErrors] = useState<string[]>([])
  const [showCropModal, setShowCropModal] = useState(false)
  const [pendingCropFile, setPendingCropFile] = useState<{ file: File; preview: string } | null>(null)
  const [filesToProcess, setFilesToProcess] = useState<File[]>([])
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [enableCropping, setEnableCropping] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const isValidFormat = (file: File) => {
    return ACCEPTED_FORMATS.includes(file.type) ||
           ACCEPTED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))
  }

  const getFileFormatError = (file: File) => {
    const ext = file.name.split('.').pop() || 'inconnu'
    return `Format non supporté: .${ext}`
  }

  // Charger les paramètres utilisateur
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await fetchUserSettings()
      setEnableCropping(settings.enable_label_cropping)
    }
    loadSettings()
  }, [])

  // Charger les batch items au montage
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Charger les items existants
      const existingItems = await loadBatch(user.id)
      setItems(existingItems)

      // Démarrer le traitement des items pending si nécessaire
      const pendingItems = existingItems.filter(i => i.status === 'pending')
      if (pendingItems.length > 0) {
        processQueue(pendingItems, existingItems)
      }
    }

    checkAuth()
  }, [])

  /**
   * Traite séquentiellement les items pending
   */
  const processQueue = async (pendingItems: BatchItem[], allItems: BatchItem[]) => {
    setProcessing(true)

    for (const item of pendingItems) {
      setProcessingId(item.id)

      try {
        // Récupérer le fichier depuis l'URL de stockage
        // On va utiliser une approche : faire une requête fetch vers l'URL publique
        // Mais c'est compliqué, donc on va recréer le flux: télécharger depuis storage

        // Alternative: on stocke le fichier temporairement quand on l'upload
        // Pour maintenant, on va supposer qu'on a un accès direct au fichier

        // Fetch l'image depuis storage
        const response = await fetch(item.image_url!)
        const blob = await response.blob()
        const file = new File([blob], 'wine-label.jpg', { type: blob.type })

        // Reconnaissance OCR
        const recognition = await processBottleImage(file)
        let { domaine, vintage, appellation, region, country, rawText } = recognition

        // Apply fuzzy matching to normalize region and appellation
        if (country && REGIONS_BY_COUNTRY[country]) {
          region = matchRegionToList(region, country)
          if (region && APPELLATIONS_BY_REGION[region]) {
            appellation = matchAppellationToList(appellation, region)
          }
        }

        // Recherche dans le catalogue
        let finalDomaine = domaine
        let hits = await searchWineCatalog(domaine, supabase)

        if (hits.length === 0) {
          finalDomaine = await verifyAndCorrectWineName(domaine, region, appellation, supabase) || domaine
          hits = await searchWineCatalog(finalDomaine, supabase)
        }

        const hasClassement = detectClassement1859(rawText, region, appellation)

        // Chercher la date de maturité optimale (utilise 'normal' par défaut)
        const [peakDateStart, peakDateEnd] = await getPeakDate(country, region, appellation, vintage, supabase, 'normal')

        // Mettre à jour l'item
        const updatedItem = await updateBatchItem(item.id, {
          status: 'done',
          name: finalDomaine,
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

        if (updatedItem) {
          setItems(prev => prev.map(i => i.id === item.id ? updatedItem : i))
        }
      } catch (error) {
        console.error(`Erreur traitement item ${item.id}:`, error)
        let errorMessage = 'Erreur lors du traitement'
        if (error instanceof Error) {
          errorMessage = error.message.split('\n')[0].substring(0, 80)
        }
        const errorItem = await updateBatchItem(item.id, {
          status: 'error',
          error_message: errorMessage
        })

        if (errorItem) {
          setItems(prev => prev.map(i => i.id === item.id ? errorItem : i))
        }
      }

      setProcessingId(null)
    }

    setProcessing(false)
  }

  /**
   * Traite les fichiers sélectionnés
   */
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || !user) return

    setLoading(true)
    const invalidFiles: string[] = []

    // Limiter à 50 fichiers et valider le format
    const validFiles = Array.from(files)
      .slice(0, 50)
      .filter((file) => {
        if (!isValidFormat(file)) {
          invalidFiles.push(`${file.name}: ${getFileFormatError(file)}`)
          return false
        }
        return true
      })

    // Afficher les erreurs de format
    if (invalidFiles.length > 0) {
      setFormatErrors(invalidFiles)
    }

    // Démarrer le crop du premier fichier (ou skipper si cropping désactivé)
    if (validFiles.length > 0) {
      if (enableCropping) {
        setFilesToProcess(validFiles)
        setCurrentFileIndex(0)
        const preview = URL.createObjectURL(validFiles[0])
        setPendingCropFile({ file: validFiles[0], preview })
        setShowCropModal(true)
      } else {
        // Skipper le crop et traiter directement
        await processFilesWithoutCrop(validFiles)
      }
    }

    setLoading(false)

    // Réinitialiser l'input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  /**
   * Traite les fichiers sans crop (quand cropping est désactivé)
   */
  const processFilesWithoutCrop = async (files: File[]) => {
    for (const file of files) {
      try {
        // Compresser l'image
        const options = { maxSizeMB: 0.19, maxWidthOrHeight: 1200, useWebWorker: true }
        const compressed = await imageCompression(file, options)

        // Upload dans Supabase Storage
        const imageUrl = await uploadBatchImage(user!.id, compressed)

        if (imageUrl) {
          const newItem = {
            status: 'pending' as const,
            image_url: imageUrl,
            name: null,
            vintage: null,
            appellation: null,
            region: null,
            country: null,
            color: '',
            is_1859: false,
            peak_date_start: null,
            peak_date_end: null,
            vintage_quality: 'normal' as const,
            raw_text: null,
            error_message: null,
          }

          const addedItems = await addBatchItems(user!.id, [newItem])
          setItems((prev) => [...addedItems, ...prev])

          // Démarrer l'OCR immédiatement après chaque upload
          const pendingItems = addedItems.filter((i) => i.status === 'pending')
          if (pendingItems.length > 0) {
            await processQueue(pendingItems, [...items, ...addedItems])
          }
        }
      } catch (error) {
        console.error(`Erreur compression/upload:`, error)
      }
    }
  }

  /**
   * Gère le crop d'une image et traite la suivante
   */
  const handleCropComplete = async (croppedFile: File) => {
    setShowCropModal(false)

    try {
      // Compresser l'image croppée
      const options = { maxSizeMB: 0.19, maxWidthOrHeight: 1200, useWebWorker: true }
      const compressed = await imageCompression(croppedFile, options)

      // Upload dans Supabase Storage
      const imageUrl = await uploadBatchImage(user!.id, compressed)

      if (imageUrl) {
        const newItem = {
          status: 'pending' as const,
          image_url: imageUrl,
          name: null,
          vintage: null,
          appellation: null,
          region: null,
          country: null,
          color: '',
          is_1859: false,
          peak_date_start: null,
          peak_date_end: null,
          vintage_quality: 'normal' as const,
          raw_text: null,
          error_message: null,
        }

        const addedItems = await addBatchItems(user!.id, [newItem])
        setItems((prev) => [...addedItems, ...prev])
      }
    } catch (error) {
      console.error(`Erreur compression/upload:`, error)
    }

    // Traiter le fichier suivant
    if (currentFileIndex + 1 < filesToProcess.length) {
      const nextIndex = currentFileIndex + 1
      setCurrentFileIndex(nextIndex)
      const preview = URL.createObjectURL(filesToProcess[nextIndex])
      setPendingCropFile({ file: filesToProcess[nextIndex], preview })
      setShowCropModal(true)
    } else {
      // Tous les fichiers sont traités, démarrer l'OCR
      setFilesToProcess([])
      setPendingCropFile(null)
      const newItems = items.filter((i) => i.status === 'pending')
      if (newItems.length > 0) {
        await processQueue(newItems, items)
      }
    }
  }

  /**
   * Relance le traitement d'un item en erreur
   */
  const handleRetry = async (item: BatchItem) => {
    const updatedItem = await updateBatchItem(item.id, { status: 'pending', error_message: null })
    if (updatedItem) {
      setItems(prev => prev.map(i => i.id === item.id ? updatedItem : i))
      await processQueue([updatedItem], items)
    }
  }

  /**
   * Supprime un item du batch
   */
  const handleDeleteItem = async (item: BatchItem) => {
    const success = await removeBatchItem(item.id)
    if (success) {
      setItems(prev => prev.filter(i => i.id !== item.id))
    }
  }

  /**
   * Met à jour un champ d'un item
   */
  const handleEditField = async (itemId: string, field: string, value: any) => {
    const updatedItem = await updateBatchItem(itemId, { [field]: value })
    if (updatedItem) {
      setItems(prev => prev.map(i => i.id === itemId ? updatedItem : i))
    }
  }

  const doneCount = items.filter(i => i.status === 'done').length
  const errorCount = items.filter(i => i.status === 'error').length
  const totalCount = items.length
  const progressPercent = totalCount > 0 ? Math.round(((doneCount + errorCount) / totalCount) * 100) : 0

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/app')}
            className="p-2 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-stone-600" />
          </button>
          <div>
            <h1 className="text-4xl font-serif font-bold text-stone-800 italic">Import en lot</h1>
            <p className="text-stone-400 text-xs uppercase font-bold tracking-widest mt-1">Jusqu'à 50 photos</p>
          </div>
        </div>

        {/* Zone de sélection de fichiers */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-stone-300 rounded-[2.5rem] p-12 text-center cursor-pointer hover:border-bordeaux hover:bg-bordeaux/5 transition-all"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_FORMATS.join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={loading || processing}
          />
          <div className="space-y-3">
            <Upload size={48} className="mx-auto text-stone-300" />
            <div>
              <p className="font-bold text-stone-700">Cliquez pour ajouter des photos</p>
              <p className="text-sm text-stone-500">ou glissez-les ici</p>
            </div>
            <p className="text-[10px] text-stone-400 uppercase font-bold">Max 50 fichiers • JPG, PNG</p>
          </div>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <p className="text-sm font-bold text-stone-700">{doneCount + errorCount}/{totalCount} traitées</p>
              <p className="text-xs text-stone-500">{progressPercent}%</p>
            </div>
            <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-bordeaux to-red-600 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Liste des items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex gap-4">
                {/* Miniature */}
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt="Étiquette"
                    className="w-20 h-24 object-cover rounded-lg flex-shrink-0 bg-stone-100"
                  />
                )}

                {/* Infos et édition */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={item.name || ''}
                        onChange={(e) => handleEditField(item.id, 'name', e.target.value)}
                        placeholder="Nom du domaine..."
                        className="w-full font-bold text-stone-800 bg-transparent outline-none border-b border-transparent hover:border-stone-300 focus:border-bordeaux transition-colors"
                        disabled={item.status === 'pending'}
                      />
                      <div className="flex gap-3 text-[10px] text-stone-500 uppercase font-bold">
                        <input
                          type="number"
                          value={item.vintage || ''}
                          onChange={(e) => handleEditField(item.id, 'vintage', e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="Millésime"
                          className="w-16 bg-transparent border-b border-stone-200 focus:border-bordeaux outline-none"
                          disabled={item.status === 'pending'}
                        />
                        <select
                          value={item.color}
                          onChange={(e) => handleEditField(item.id, 'color', e.target.value)}
                          className="bg-transparent border-b border-stone-200 focus:border-bordeaux outline-none"
                          disabled={item.status === 'pending'}
                        >
                          <option value="">Couleur...</option>
                          <option value="red">Rouge</option>
                          <option value="white">Blanc</option>
                          <option value="rose">Rosé</option>
                        </select>
                      </div>
                    </div>

                    {/* Badge statut */}
                    <div className="flex flex-col items-center">
                      {item.status === 'pending' && (
                        <div className="flex flex-col items-center gap-1">
                          <Loader2 className="animate-spin text-blue-500" size={20} />
                          <span className="text-[9px] text-blue-500 font-bold uppercase">En attente</span>
                        </div>
                      )}
                      {item.status === 'done' && item.name && (
                        <div className="flex flex-col items-center gap-1">
                          <CheckCircle2 className="text-green-600" size={20} />
                          <span className="text-[9px] text-green-600 font-bold uppercase">Prêt</span>
                        </div>
                      )}
                      {item.status === 'error' && (
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className="text-red-500" size={20} />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRetry(item)}
                              className="text-[9px] text-red-500 font-bold uppercase hover:underline"
                            >
                              Relancer
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="text-[9px] text-red-500 font-bold uppercase hover:underline"
                              title="Supprimer cette bouteille"
                            >
                              Suppr.
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Message d'erreur */}
                  {item.error_message && (
                    <p className="text-[10px] text-red-500 font-medium">{item.error_message}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bouton action */}
        {doneCount > 0 && (
          <button
            onClick={() => router.push('/app')}
            className="w-full py-4 bg-bordeaux text-white rounded-2xl font-bold shadow-lg shadow-bordeaux/20 hover:bg-stone-800 active:scale-95 transition-all"
          >
            Finalisation de l'import
          </button>
        )}

        {items.length === 0 && !loading && (
          <div className="text-center py-12 space-y-3">
            <Wine className="mx-auto text-stone-200" size={48} />
            <p className="text-stone-400 italic">Aucune photo sélectionnée</p>
          </div>
        )}
      </div>

      {/* --- MODAL ERREURS FORMAT --- */}
      {formatErrors.length > 0 && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-serif font-bold text-stone-800 italic">Fichiers non traités</h2>
              <p className="text-[10px] text-stone-400 uppercase font-bold">Formats non supportés</p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {formatErrors.map((error, idx) => (
                <div key={idx} className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
                  <p className="text-sm font-medium text-stone-800">{error.split(':')[0]}</p>
                  <p className="text-xs text-red-600">{error.split(':').slice(1).join(':').trim()}</p>
                </div>
              ))}
            </div>

            <div className="bg-stone-50 rounded-xl p-4 space-y-1">
              <p className="text-xs font-bold text-stone-600 uppercase">Formats acceptés</p>
              <p className="text-sm text-stone-700">JPG • PNG</p>
            </div>

            <button
              onClick={() => setFormatErrors([])}
              className="w-full py-4 bg-bordeaux text-white rounded-2xl font-bold shadow-lg shadow-bordeaux/20 hover:bg-stone-800 active:scale-95 transition-all"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL CROP D'IMAGE --- */}
      {showCropModal && pendingCropFile && (
        <ImageCropModal
          imageUrl={pendingCropFile.preview}
          imageFile={pendingCropFile.file}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropModal(false)
            setPendingCropFile(null)
            setFilesToProcess([])
            setCurrentFileIndex(0)
          }}
        />
      )}
    </div>
  )
}
