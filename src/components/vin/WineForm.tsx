"use client"
import { useState } from 'react'

export default function WineForm({ onSave }: any) {
  const [formData, setFormData] = useState({
    name: '', vintage: 2024, color: 'red', style: 'still', 
    is_1859: false, peak_date: 2030, grapes: ''
  })

  return (
    <div className="space-y-4 bg-stone-50 p-4 rounded-2xl">
      <input className="w-full p-3 rounded-xl border" placeholder="Nom du Vin" 
        onChange={e => setFormData({...formData, name: e.target.value})} />
      
      <div className="grid grid-cols-2 gap-2">
        <input type="number" className="p-3 rounded-xl border" placeholder="Millésime" 
          onChange={e => setFormData({...formData, vintage: parseInt(e.target.value)})} />
        <select className="p-3 rounded-xl border" onChange={e => setFormData({...formData, color: e.target.value})}>
          <option value="red">Rouge</option>
          <option value="white">Blanc</option>
          <option value="rose">Rosé</option>
        </select>
      </div>

      <div className="flex items-center gap-2 p-2 bg-white rounded-xl border">
        <input type="checkbox" id="c1859" onChange={e => setFormData({...formData, is_1859: e.target.checked})} />
        <label htmlFor="c1859" className="text-sm font-medium">Classement 1859 ?</label>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-stone-500 uppercase ml-2">Année d'apogée</label>
        <input type="number" className="w-full p-3 rounded-xl border font-bold text-bordeaux" 
          placeholder="Apogée" onChange={e => setFormData({...formData, peak_date: parseInt(e.target.value)})} />
      </div>

      <button onClick={() => onSave(formData)} className="w-full py-4 bg-bordeaux text-white rounded-2xl font-bold shadow-lg shadow-bordeaux/20">
        Ajouter à ma collection
      </button>
    </div>
  )
}

