"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

const STORAGE_KEY = 'blinkDuration'
const DEFAULT_DURATION = 15

export default function SettingsPage() {
  const router = useRouter()
  const [duration, setDuration] = useState(DEFAULT_DURATION)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // Load duration from localStorage
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setDuration(parseInt(saved))
    }
    setIsMounted(true)
  }, [])

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, duration.toString())
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
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-100 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-stone-700 block mb-2">
                Durée de clignotement des vins sélectionnés
              </label>
              <p className="text-xs text-stone-400 mb-4">
                Définissez combien de temps les bouteilles doivent clignoter quand vous les sélectionnez depuis la page "Mes Bouteilles".
              </p>
            </div>

            {/* Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-bordeaux"
                />
              </div>

              {/* Value display */}
              <div className="flex items-center justify-between bg-stone-50 rounded-2xl p-4">
                <span className="text-sm text-stone-600">Valeur actuelle:</span>
                <span className="text-2xl font-bold text-bordeaux">{duration}s</span>
              </div>

              {/* Quick buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[5, 15, 30].map((val) => (
                  <button
                    key={val}
                    onClick={() => setDuration(val)}
                    className={`py-2 rounded-xl font-bold text-sm transition-all ${
                      duration === val
                        ? 'bg-bordeaux text-white shadow-md'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {val}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={() => {
              handleSave()
              router.push('/menu')
            }}
            className="w-full py-4 bg-bordeaux text-white rounded-2xl font-bold shadow-lg shadow-bordeaux/20 active:scale-95 transition-all"
          >
            Enregistrer
          </button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">ℹ️ À savoir</p>
          <p className="text-xs text-blue-700">
            Quand vous cliquez sur un millésime depuis "Mes Bouteilles", les bouteilles de ce vin clignotent pour {duration} secondes dans la vue casier.
          </p>
        </div>
      </div>
    </div>
  )
}
