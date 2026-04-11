"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { fetchUserSettings, saveUserSettings, syncSettingsToLocalStorage } from '@/lib/settings-service'

const DEFAULT_BLINK = 15
const DEFAULT_TIMEOUT = 5
const DEFAULT_DENSITY = 'normal'

export default function SettingsPage() {
  const router = useRouter()
  const [blinkDuration, setBlinkDuration] = useState(DEFAULT_BLINK)
  const [timeoutDuration, setTimeoutDuration] = useState(DEFAULT_TIMEOUT)
  const [displayDensity, setDisplayDensity] = useState<'compact' | 'normal' | 'spacious'>(DEFAULT_DENSITY as any)
  const [enableLabelCropping, setEnableLabelCropping] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load settings from database
    const loadSettings = async () => {
      const settings = await fetchUserSettings()
      setBlinkDuration(settings.blink_duration)
      setTimeoutDuration(settings.timeout_duration)
      setDisplayDensity(settings.display_density)
      setEnableLabelCropping(settings.enable_label_cropping)
      setIsMounted(true)
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setLoading(true)
    const success = await saveUserSettings({
      blink_duration: blinkDuration,
      timeout_duration: timeoutDuration,
      display_density: displayDensity,
      enable_label_cropping: enableLabelCropping,
    })

    if (success) {
      // Sync to localStorage for fast access
      syncSettingsToLocalStorage({
        blink_duration: blinkDuration,
        timeout_duration: timeoutDuration,
        display_density: displayDensity,
        enable_label_cropping: enableLabelCropping,
      })
      router.push('/menu')
    }
    setLoading(false)
  }

  if (!isMounted) return null

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/menu')}
            className="p-3 bg-white rounded-2xl shadow-sm text-stone-400 hover:text-bordeaux transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-serif font-bold text-stone-800 italic">Paramètres</h1>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Vos préférences</p>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          {/* 1. Clignotement */}
          <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-100 space-y-4">
            <div>
              <label className="text-sm font-bold text-stone-700 block">
                ⏱️ Durée de clignotement
              </label>
              <p className="text-xs text-stone-400 mb-3">
                Durée du clignotement des bouteilles sélectionnées (5-30s)
              </p>
            </div>
            <div className="space-y-3">
              <input
                type="range"
                min="5"
                max="30"
                value={blinkDuration}
                onChange={(e) => setBlinkDuration(parseInt(e.target.value))}
                className="w-full h-2 bg-stone-200 rounded-lg accent-bordeaux"
              />
              <div className="flex items-center justify-between bg-stone-50 rounded-2xl p-3">
                <span className="text-xs text-stone-600">Actuel:</span>
                <span className="text-lg font-bold text-bordeaux">{blinkDuration}s</span>
              </div>
            </div>
          </div>

          {/* 2. Timeout d'inactivité */}
          <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-100 space-y-4">
            <div>
              <label className="text-sm font-bold text-stone-700 block">
                🔒 Timeout d'inactivité
              </label>
              <p className="text-xs text-stone-400 mb-3">
                Déconnexion automatique après inactivité (2-10 min)
              </p>
            </div>
            <div className="space-y-3">
              <input
                type="range"
                min="2"
                max="10"
                value={timeoutDuration}
                onChange={(e) => setTimeoutDuration(parseInt(e.target.value))}
                className="w-full h-2 bg-stone-200 rounded-lg accent-bordeaux"
              />
              <div className="flex items-center justify-between bg-stone-50 rounded-2xl p-3">
                <span className="text-xs text-stone-600">Actuel:</span>
                <span className="text-lg font-bold text-bordeaux">{timeoutDuration} min</span>
              </div>
            </div>
          </div>

          {/* 3. Densité d'affichage */}
          <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-100 space-y-4">
            <div>
              <label className="text-sm font-bold text-stone-700 block">
                📊 Densité d'affichage
              </label>
              <p className="text-xs text-stone-400 mb-3">
                Compacte, normale ou spacieuse
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['compact', 'normal', 'spacious'] as const).map((density) => (
                <button
                  key={density}
                  onClick={() => setDisplayDensity(density)}
                  className={`py-3 rounded-xl font-bold text-xs transition-all ${
                    displayDensity === density
                      ? 'bg-bordeaux text-white shadow-md'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {density === 'compact' ? '📦' : density === 'normal' ? '📄' : '📖'} {density === 'compact' ? 'Compact' : density === 'normal' ? 'Normal' : 'Spacieux'}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Cropping des étiquettes */}
          <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-100 space-y-4">
            <div>
              <label className="text-sm font-bold text-stone-700 block">
                ✂️ Recadrage des étiquettes
              </label>
              <p className="text-xs text-stone-400 mb-3">
                Permet de recadrer les photos d'étiquettes avant traitement (peut ralentir sur téléphone ancien)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setEnableLabelCropping(true)}
                className={`py-3 rounded-xl font-bold text-sm transition-all ${
                  enableLabelCropping
                    ? 'bg-bordeaux text-white shadow-md'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                ✓ Activé
              </button>
              <button
                onClick={() => setEnableLabelCropping(false)}
                className={`py-3 rounded-xl font-bold text-sm transition-all ${
                  !enableLabelCropping
                    ? 'bg-bordeaux text-white shadow-md'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                ✕ Désactivé
              </button>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-100">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-4 bg-bordeaux text-white rounded-2xl font-bold shadow-lg shadow-bordeaux/20 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : null}
            {loading ? 'Enregistrement...' : 'Enregistrer tous les paramètres'}
          </button>
        </div>
      </div>
    </div>
  )
}
