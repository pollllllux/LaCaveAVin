"use client"
import { useState } from 'react'
import { Star, X } from 'lucide-react'

export default function ConsumeModal({ wineName, entryDate, onConfirm, onCancel }: any) {
  const [reason, setReason] = useState<'drunk' | 'gift'>('drunk')
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')

  // Date par défaut = aujourd'hui au format YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0]
  const [consumedDate, setConsumedDate] = useState(today)

  return (
    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-serif font-bold text-stone-800 italic">Sortie du flacon</h2>
          <button onClick={onCancel} className="text-stone-300"><X /></button>
        </div>

        {/* Sélecteur de date */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-stone-400 block">Date de sortie</label>
          <input
            type="date"
            value={consumedDate}
            onChange={(e) => setConsumedDate(e.target.value)}
            className="w-full p-3 bg-stone-50 rounded-2xl text-sm border-none outline-none focus:ring-2 focus:ring-bordeaux/20"
          />
        </div>

        <div className="flex gap-2 p-1 bg-stone-100 rounded-2xl">
          <button
            onClick={() => setReason('drunk')}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${reason === 'drunk' ? 'bg-white shadow-sm text-bordeaux' : 'text-stone-400'}`}
          >Bouteille bue</button>
          <button
            onClick={() => setReason('gift')}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${reason === 'gift' ? 'bg-white shadow-sm text-bordeaux' : 'text-stone-400'}`}
          >Offerte</button>
        </div>

        {reason === 'drunk' && (
          <div className="space-y-4 animate-in slide-in-from-top-2">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={28}
                  onClick={() => setRating(s)}
                  className={`cursor-pointer transition-colors ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-stone-200'}`}
                />
              ))}
            </div>
            <textarea
              maxLength={500}
              placeholder="Tes impressions (climat, accords, émotion...)"
              className="w-full p-4 bg-stone-50 rounded-2xl text-sm border-none outline-none focus:ring-2 focus:ring-bordeaux/20 h-32 resize-none"
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />
            <p className="text-[10px] text-right text-stone-300 font-bold">{review.length} / 500</p>
          </div>
        )}

        {reason === 'gift' && (
          <div className="space-y-4 animate-in slide-in-from-top-2">
            <textarea
              maxLength={500}
              placeholder="À qui l'as-tu offerte? (nom, occasion...)"
              className="w-full p-4 bg-stone-50 rounded-2xl text-sm border-none outline-none focus:ring-2 focus:ring-bordeaux/20 h-32 resize-none"
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />
            <p className="text-[10px] text-right text-stone-300 font-bold">{review.length} / 500</p>
          </div>
        )}

        <button
          onClick={() => onConfirm({ reason, rating, review, consumedDate, entryDate })}
          className="w-full py-4 bg-bordeaux text-white rounded-2xl font-bold shadow-lg shadow-bordeaux/20 active:scale-95 transition-all"
        >
          Valider la sortie
        </button>
      </div>
    </div>
  )
}


