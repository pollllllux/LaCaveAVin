"use client"
import { useState } from 'react'
import { X, Save, Wine as WineIcon, Globe, MapPin, Star } from 'lucide-react'

export default function WineForm({ x, y, onSave, onCancel }: any) {
  const [form, setForm] = useState({
    name: '',
    vintage: new Date().getFullYear(),
    color: 'red',
    country: 'France',
    region: '',
    appellation: '',
    is_1859_classified: false,
    style: 'still', 
    sweetness: 'dry',
    producer_url: '',
    grapes: '',
    peak_date: new Date().getFullYear() + 10
  })

  return (
    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-[500] p-4 flex items-center justify-center overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative my-8 animate-in slide-in-from-bottom-10 duration-500">
        
        {/* Bouton Fermer */}
        <button 
          onClick={onCancel} 
          className="absolute top-6 right-6 text-stone-300 hover:text-stone-500 transition-colors p-2"
        >
          <X size={24}/>
        </button>
        
        <header className="text-center space-y-1">
          <div className="inline-flex p-3 bg-bordeaux/5 text-bordeaux rounded-full mb-2">
            <WineIcon size={24} />
          </div>
          <h2 className="text-2xl font-serif font-bold text-stone-800 italic">Nouveau Flacon</h2>
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Position : {x} , {y}</p>
        </header>

        <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-2 no-scrollbar">
          
          {/* Section 1 : Identité */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase ml-3">Domaine / Cuvée</label>
              <input 
                autoFocus
                className="w-full p-4 bg-stone-50 rounded-2xl border-2 border-transparent focus:border-bordeaux/10 focus:bg-white outline-none transition-all"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Ex: Château Lynch-Bages"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase ml-3">Millésime</label>
                <input 
                  type="number" 
                  className="w-full p-4 bg-stone-50 rounded-2xl border-none outline-none" 
                  value={form.vintage} 
                  onChange={e => setForm({...form, vintage: parseInt(e.target.value)})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase ml-3">Couleur</label>
                <select 
                  className="w-full p-4 bg-stone-50 rounded-2xl outline-none appearance-none text-sm font-bold" 
                  value={form.color} 
                  onChange={e => setForm({...form, color: e.target.value})}
                >
                  <option value="red">Rouge</option>
                  <option value="white">Blanc</option>
                  <option value="rose">Rosé</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2 : Terroir (Spec 14) */}
          <div className="p-5 bg-stone-50 rounded-[2rem] space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Pays</label>
                <input className="w-full bg-transparent border-b border-stone-200 py-2 outline-none text-sm" value={form.country} onChange={e => setForm({...form, country: e.target.value})}/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Région</label>
                <input className="w-full bg-transparent border-b border-stone-200 py-2 outline-none text-sm" placeholder="Bordeaux..." value={form.region} onChange={e => setForm({...form, region: e.target.value})}/>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Appellation</label>
              <input className="w-full bg-transparent border-b border-stone-200 py-2 outline-none text-sm" placeholder="Pauillac..." value={form.appellation} onChange={e => setForm({...form, appellation: e.target.value})}/>
            </div>
          </div>

          {/* Section 3 : Caractéristiques & Style */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase ml-3">Style</label>
              <select className="w-full p-4 bg-stone-50 rounded-2xl text-xs font-bold outline-none" value={form.style} onChange={e => setForm({...form, style: e.target.value})}>
                <option value="still">Tranquille</option>
                <option value="sparkling">Effervescent</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase ml-3">Sucre</label>
              <select className="w-full p-4 bg-stone-50 rounded-2xl text-xs font-bold outline-none" value={form.sweetness} onChange={e => setForm({...form, sweetness: e.target.value})}>
                <option value="dry">Sec</option>
                <option value="sweet">Moelleux / Doux</option>
              </select>
            </div>
          </div>

          {/* Classement 1859 */}
          <label className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${form.is_1859_classified ? 'border-amber-200 bg-amber-50' : 'border-stone-100 bg-white'}`}>
            <div className="flex items-center gap-3">
              <Star size={18} className={form.is_1859_classified ? 'text-amber-500 fill-amber-500' : 'text-stone-300'} />
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-600">Classement 1859</span>
            </div>
            <input 
              type="checkbox" 
              className="w-5 h-5 accent-amber-500 rounded-lg"
              checked={form.is_1859_classified} 
              onChange={e => setForm({...form, is_1859_classified: e.target.checked})}
            />
          </label>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-400 uppercase ml-3">Année d'apogée conseillée</label>
            <input 
              type="number" 
              className="w-full p-4 bg-stone-50 rounded-2xl outline-none font-bold text-bordeaux" 
              value={form.peak_date} 
              onChange={e => setForm({...form, peak_date: parseInt(e.target.value)})}
            />
          </div>
        </div>

        {/* Bouton de validation */}
        <button 
          onClick={() => onSave(form)}
          className="w-full py-5 bg-bordeaux text-white rounded-[2rem] font-bold shadow-xl shadow-bordeaux/20 flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-stone-800"
        >
          <Save size={20} />
          Placer la bouteille
        </button>
      </div>
    </div>
  )
}

