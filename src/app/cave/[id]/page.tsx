"use client"

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, Plus, Wine, Loader2, Trash2,
  Layers, X, LayoutGrid, ChevronRight,
  LogOut, BookOpen, Star, Calendar, Pencil
} from 'lucide-react'
import WineForm from '@/components/WineForm'
import ConsumeModal from '@/components/ConsumeModal'
import { capitalize } from '@/lib/format'
import { fetchUserSettings, syncSettingsToLocalStorage } from '@/lib/settings-service'

export default function CellarDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Lire le paramètre unitIndex depuis la query string
  const unitParam = searchParams.get('unit')
  const initialUnitIndex = unitParam ? parseInt(unitParam) : 0

  // -- État des données --
  const [cellar, setCellar] = useState<any>(null)
  const [bottles, setBottles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // -- État de la navigation (Spec 9) --
  const [viewMode, setViewMode] = useState<'overview' | 'management'>(unitParam ? 'management' : 'overview')
  const [activeUnitIndex, setActiveUnitIndex] = useState(initialUnitIndex)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // -- État des Modals --
  const [selectedPos, setSelectedPos] = useState<{x: number, y: number} | null>(null)
  const [viewingBottle, setViewingBottle] = useState<any>(null)
  const [editingBottle, setEditingBottle] = useState<any>(null)
  const [showConsumeModal, setShowConsumeModal] = useState<any>(null)
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [showFullPhoto, setShowFullPhoto] = useState(false)
  const [bottlesAwaitingPlacement, setBottlesAwaitingPlacement] = useState<any[]>([])
  const [longPressPopover, setLongPressPopover] = useState<{ wine: any; x: number; y: number } | null>(null)
  const [hoverPopover, setHoverPopover] = useState<{ wine: any; mouseX: number; mouseY: number } | null>(null)
  const [isHoverDevice, setIsHoverDevice] = useState(true)
  const [highlightBottles, setHighlightBottles] = useState<string[]>([])
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Detect if device supports hover (PC) or not (mobile)
    const hasHover = window.matchMedia('(hover: hover)').matches
    setIsHoverDevice(hasHover)

    // Load settings from DB on mount
    fetchUserSettings().then(settings => {
      syncSettingsToLocalStorage(settings)
    })
  }, [])

  // Formulaire pour nouveau casier (Spec 8)
  const [newUnit, setNewUnit] = useState({ name: '', width: 6, height: 4 })

  useEffect(() => {
    fetchData()
  }, [id])

  // Recharger les bouteilles quand on entre dans un casier ou qu'on en change
  useEffect(() => {
    if (viewMode === 'management' && cellar) {
      fetchBottles()
    }
  }, [activeUnitIndex, viewMode, cellar?.id])

  // Handle highlight from /vins page
  useEffect(() => {
    const highlight = searchParams.get('highlight')
    if (highlight) {
      const [wineId, vintage] = highlight.split(':')
      // Find bottles of this wine/vintage
      const bottlesToHighlight = bottles
        .filter(b => b.wine_id === wineId && b.wine?.vintage === parseInt(vintage))
        .map(b => b.id)

      setHighlightBottles(bottlesToHighlight)

      // Get duration from localStorage (default 15 seconds)
      const savedDuration = localStorage.getItem('blinkDuration')
      const durationSeconds = savedDuration ? parseInt(savedDuration) : 15
      const durationMs = durationSeconds * 1000

      // Remove highlight after user-configured duration
      const timer = setTimeout(() => {
        setHighlightBottles([])
      }, durationMs)

      return () => clearTimeout(timer)
    }
  }, [bottles, searchParams])

  async function fetchData() {
    setLoading(true)
    const { data: cellarData, error } = await supabase
      .from('cellars')
      .select('*, storage_units(*)')
      .eq('id', id)
      .single()
    
    if (cellarData) {
      // Trier les casiers par date de création pour garder un ordre constant
      cellarData.storage_units.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      setCellar(cellarData)
    }
    setLoading(false)
  }

  async function handleAddUnit() {
    if (!newUnit.name || !cellar?.id) return

    const { error } = await supabase.from('storage_units').insert([{
      name: newUnit.name,
      cellar_id: cellar.id,
      width: newUnit.width,
      height: newUnit.height
    }])

    if (error) {
      console.error('Erreur ajout casier:', error.message)
      return
    }

    setShowAddUnit(false)
    setNewUnit({ name: '', width: 6, height: 4 })
    await fetchData()
  }

async function fetchBottles() {
  // On récupère le casier actif
  const currentUnit = cellar?.storage_units[activeUnitIndex];
  if (!currentUnit) return;

  // On récupère les bouteilles pour le casier actif
  const { data: bottlesData, error: bottlesError } = await supabase
    .from('bottles')
    .select('*')
    .eq('storage_unit_id', currentUnit.id)
    .eq('status', 'in_stock')
    .order('pos_y', { ascending: true })
    .order('pos_x', { ascending: true });

  if (bottlesError) {
    console.error("Erreur Fetch bouteilles:", bottlesError.message);
    setBottles([]);
    return;
  }

  if (!bottlesData || bottlesData.length === 0) {
    setBottles([]);
    return;
  }

  const wineIds = Array.from(new Set(bottlesData.map((b: any) => b.wine_id).filter(Boolean)));
  if (wineIds.length === 0) {
    setBottles(bottlesData);
    return;
  }

  const { data: winesData, error: winesError } = await supabase
    .from('wines')
    .select('*')
    .in('id', wineIds);

  if (winesError) {
    console.error("Erreur Fetch vins:", winesError.message);
    setBottles(bottlesData);
    return;
  }

  const winesMap = (winesData || []).reduce((acc: any, wine: any) => {
    acc[wine.id] = wine;
    return acc;
  }, {} as Record<string, any>);

  setBottles((bottlesData || []).map((b: any) => ({
    ...b,
    wine: winesMap[b.wine_id] || null,
  })));
}


  const handleSaveWine = async (wineFields: any) => {
    if (!selectedPos) {
      alert("Selectionne une position vide avant de valider cette bouteille.")
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert("Tu dois etre connecte pour ajouter une bouteille.")
      return
    }

    const currentUnit = cellar?.storage_units?.[activeUnitIndex]
    if (!currentUnit) {
      alert("Impossible de trouver le casier actif.")
      return
    }

    const quantity = wineFields.quantity || 1

    // Extract quantity before inserting to DB (it's not a column in wines table)
    const { quantity: _, ...wineData } = wineFields

    // 1. Create wine record (Table WINES - Spec 14/19)
    const { data: wine, error: wineErr } = await supabase
      .from('wines')
      .insert([{ ...wineData, user_id: user.id }])
      .select()
      .single()

    if (wineErr) {
      console.error("Erreur creation vin:", wineErr.message)
      alert("Erreur lors de la creation du vin. Verifie les champs et reessaie.")
      return
    }

    // 2. Create first physical bottle (Table BOTTLES - Spec 19)
    const { error: bottleErr } = await supabase.from('bottles').insert([{
      wine_id: wine.id,
      storage_unit_id: currentUnit.id,
      pos_x: selectedPos.x,
      pos_y: selectedPos.y,
      status: 'in_stock'
    }])

    if (bottleErr) {
      console.error("Erreur creation bouteille:", bottleErr.message)
      alert("Erreur lors de l'ajout de la bouteille. Verifie la position et reessaie.")
      return
    }

    // 3. If quantity > 1, add remaining bottles to awaiting placement
    if (quantity > 1) {
      const remainingBottles = Array.from({ length: quantity - 1 }, () => ({
        wine_id: wine.id,
        storage_unit_id: currentUnit.id,
        wine: wine
      }))
      setBottlesAwaitingPlacement(remainingBottles)
    }

    setSelectedPos(null)
    await fetchBottles()
  }

  const handleUpdateWine = async (wineFields: any) => {
    const wine = editingBottle?.wine || editingBottle?.wines
    if (!wine?.id) {
      alert("Erreur: impossible de récupérer l'ID du vin à modifier.")
      return
    }
    // Extract quantity (not a column in wines table)
    const { quantity: _, ...wineData } = wineFields
    const { error } = await supabase
      .from('wines')
      .update(wineData)
      .eq('id', wine.id)
    if (error) {
      console.error('Erreur mise à jour vin:', error.message)
      alert('Erreur lors de la mise à jour du vin. Verifie les champs et reessaie.')
      return
    }
    setEditingBottle(null)
    setViewingBottle(null)
    await fetchBottles()
  }

  const handleConfirmConsume = async (consumptionData: any) => {
    const bottleId = showConsumeModal.id

    // 1. Sortie de cave (Spec 19)
    const { error: updateError } = await supabase
      .from('bottles')
      .update({ status: 'removed' })
      .eq('id', bottleId)

    if (!updateError) {
      // 2. Enregistrement historique & avis (Spec 11)
      await supabase.from('consumption_history').insert([{
        bottle_id: bottleId,
        reason: consumptionData.reason,
        rating: consumptionData.rating,
        review: consumptionData.review,
        entry_date: consumptionData.entryDate,
        consumed_date: consumptionData.consumedDate
      }])

      setShowConsumeModal(null)
      setViewingBottle(null)
      fetchBottles()
    }
  }

  const handlePlaceAwaitingBottle = async (x: number, y: number) => {
    if (bottlesAwaitingPlacement.length === 0) return

    const currentUnit = cellar?.storage_units?.[activeUnitIndex]
    if (!currentUnit) return

    const bottleToPlace = bottlesAwaitingPlacement[0]

    // Create bottle in database
    const { error } = await supabase.from('bottles').insert([{
      wine_id: bottleToPlace.wine_id,
      storage_unit_id: currentUnit.id,
      pos_x: x,
      pos_y: y,
      status: 'in_stock'
    }])

    if (error) {
      console.error('Erreur creation bouteille:', error.message)
      alert('Erreur lors du placement de la bouteille.')
      return
    }

    // Remove from awaiting list
    const remaining = bottlesAwaitingPlacement.slice(1)
    setBottlesAwaitingPlacement(remaining)

    // Refresh grid
    await fetchBottles()
  }

  const handleLongPressStart = (wine: any, x: number, y: number) => {
    if (!wine) return
    longPressTimerRef.current = setTimeout(() => {
      setLongPressPopover({ wine, x, y })
    }, 500)
  }

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-stone-50 text-bordeaux">
      <Loader2 className="animate-spin mb-4" size={40} />
      <p className="font-serif italic animate-pulse">Ouverture du domaine...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 overflow-x-hidden">
      
      {/* --- SIDEBAR (Spec 9) --- */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-stone-900 text-stone-100 z-[300] transform transition-transform duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-center border-b border-stone-800 pb-6">
            <span className="font-serif italic font-bold text-2xl text-bordeaux">maCaveAVin</span>
            <X onClick={() => setIsSidebarOpen(false)} className="text-stone-500 cursor-pointer active:scale-75 transition-transform" />
          </div>
          <nav className="space-y-2">
            <button onClick={() => {setViewMode('overview'); setIsSidebarOpen(false)}} className="flex items-center gap-4 w-full p-4 hover:bg-stone-800 rounded-2xl transition-all text-xs font-bold uppercase tracking-widest group">
              <LayoutGrid size={18} className="text-bordeaux group-hover:scale-110 transition-transform" /> Ma Cave
            </button>
            <button onClick={() => router.push('/bouteilles')} className="flex items-center gap-4 w-full p-4 hover:bg-stone-800 rounded-2xl transition-all text-xs font-bold uppercase tracking-widest text-stone-400">
              <BookOpen size={18} /> Mes Bouteilles
            </button>
            <div className="pt-8 border-t border-stone-800 mt-4">
              <button onClick={() => router.push('/')} className="flex items-center gap-4 w-full p-4 text-stone-400 hover:text-white transition-colors text-xs font-bold uppercase">
                <ArrowLeft size={18} /> Changer de cave
              </button>
              <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-4 w-full p-4 text-red-400/70 hover:text-red-400 transition-colors text-xs font-bold uppercase">
                <LogOut size={18} /> Déconnexion
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="p-6 pb-24 max-w-md mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-white rounded-2xl shadow-sm text-stone-400 active:scale-90 transition-transform border border-stone-100">
              <Layers size={20}/>
            </button>
            <div>
              <h1 className="text-2xl font-serif font-bold text-stone-800 italic leading-tight">{cellar?.name}</h1>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                {viewMode === 'overview' ? 'Mode Overview' : cellar?.storage_units[activeUnitIndex]?.name}
              </p>
            </div>
          </div>
        </header>

        {/* --- MODE OVERVIEW (Spec 9) --- */}
        {viewMode === 'overview' ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center px-2">
              <p className="text-[10px] text-stone-400 uppercase font-bold tracking-widest italic">Rangements ({cellar?.storage_units?.length}/5)</p>
              {cellar?.storage_units?.length < 5 && (
                <button 
                  onClick={() => setShowAddUnit(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-bordeaux text-white rounded-full text-[10px] font-bold uppercase shadow-lg shadow-bordeaux/20 active:scale-95 transition-all"
                >
                  <Plus size={14} /> Nouveau
                </button>
              )}
            </div>

            {cellar?.storage_units?.map((unit: any, index: number) => (
              <div 
                key={unit.id}
                onClick={() => {setActiveUnitIndex(index); setViewMode('management')}}
                className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-stone-50 rounded-[1.5rem] text-bordeaux group-hover:bg-bordeaux group-hover:text-white transition-all shadow-inner">
                    <LayoutGrid size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-800 text-lg">{unit.name}</h3>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tight">
                      Grille {unit.width}x{unit.height} • {unit.width * unit.height} places
                    </p>
                  </div>
                </div>
                <ChevronRight className="text-stone-200 group-hover:text-bordeaux transform group-hover:translate-x-1 transition-all" />
              </div>
            ))}

            {cellar?.storage_units?.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-stone-200 rounded-[3rem] space-y-4">
                <div className="bg-stone-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-stone-300">
                  <Plus size={32} />
                </div>
                <p className="text-stone-400 text-sm font-serif italic">Aucun casier créé dans cette cave.</p>
                <button onClick={() => setShowAddUnit(true)} className="text-bordeaux font-bold uppercase text-[10px] tracking-widest border-b border-bordeaux pb-1">Initialiser maintenant</button>
              </div>
            )}
          </div>
        ) : (
          /* --- MODE GESTION (Spec 10) --- */
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between px-2">
              <button 
                onClick={() => setViewMode('overview')} 
                className="text-[10px] font-bold uppercase text-stone-400 flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm hover:text-bordeaux transition-colors"
              >
                <ArrowLeft size={12} /> Vue d'ensemble
              </button>
              <div className="flex items-center gap-2 text-bordeaux">
                <div className="w-2 h-2 rounded-full bg-bordeaux animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Edit</span>
              </div>
            </div>

            {/* Alert: Bottles awaiting placement */}
            {bottlesAwaitingPlacement.length > 0 && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-[2.5rem] p-4 flex items-center gap-3 animate-pulse">
                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-blue-900">
                    {bottlesAwaitingPlacement.length} bouteille{bottlesAwaitingPlacement.length > 1 ? 's' : ''} a placer
                  </p>
                  <p className="text-[10px] text-blue-700">Cliquez sur les emplacements vides pour les placer</p>
                </div>
              </div>
            )}

            {/* Grille Interactive (Spec 10) - Cave Ouverte */}
            <div className="relative overflow-hidden rounded-[2.5rem] shadow-2xl" style={{
              background: 'linear-gradient(135deg, #3d2817 0%, #5c4033 20%, #4a3728 50%, #3d2817 80%, #2a1810 100%)',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3)'
            }}>
              {/* Effet de porte/cadre */}
              <div className="absolute inset-0 border-8 border-amber-900/40 rounded-[2.5rem] pointer-events-none" />
              <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-b from-black/5 to-black/10 pointer-events-none" />

              {/* Contenu */}
              <div className="p-5 relative z-10">
              <div 
                className="grid gap-2" 
                style={{ gridTemplateColumns: `repeat(${cellar.storage_units[activeUnitIndex].width}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: cellar.storage_units[activeUnitIndex].width * cellar.storage_units[activeUnitIndex].height }).map((_, i) => {
                  const x = (i % cellar.storage_units[activeUnitIndex].width) + 1
                  const y = Math.floor(i / cellar.storage_units[activeUnitIndex].width) + 1
                  const bottle = bottles.find(b => b.pos_x === x && b.pos_y === y)
                  const wine = bottle?.wine || bottle?.wines
                  const isOccupied = Boolean(bottle)
                  const hasAwaitingBottles = bottlesAwaitingPlacement.length > 0

                  return (
                    <div
                      key={i}
                      onPointerDown={() => !isHoverDevice && handleLongPressStart(wine, x, y)}
                      onPointerUp={() => !isHoverDevice && handleLongPressEnd()}
                      onPointerLeave={() => !isHoverDevice && handleLongPressEnd()}
                      onMouseEnter={(e) => isHoverDevice && wine && setHoverPopover({ wine, mouseX: e.clientX, mouseY: e.clientY })}
                      onMouseLeave={() => isHoverDevice && setHoverPopover(null)}
                      onClick={() => {
                        handleLongPressEnd()
                        if (bottle) {
                          setViewingBottle(bottle)
                        } else if (hasAwaitingBottles) {
                          handlePlaceAwaitingBottle(x, y)
                        } else {
                          setSelectedPos({x, y})
                        }
                      }}
                      className={`aspect-square rounded-full flex flex-col items-center justify-center transition-all cursor-pointer group relative overflow-hidden shadow-md hover:shadow-lg ${highlightBottles.includes(bottle?.id) ? 'animate-pulse ring-4 ring-yellow-300' : ''}
                        ${wine
                          ? (wine.color === 'white' ? 'bg-gradient-to-br from-amber-300 to-amber-400 border-2 border-amber-500' : wine.color === 'rose' ? 'bg-gradient-to-br from-rose-200 to-rose-300 border-2 border-rose-400' : 'bg-gradient-to-br from-bordeaux to-red-900 border-2 border-red-950 text-white')
                          : isOccupied
                          ? 'bg-gradient-to-br from-stone-300 to-stone-400 border-2 border-stone-500'
                          : hasAwaitingBottles
                          ? 'bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-300 group-hover:from-blue-200 group-hover:to-blue-300'
                          : 'bg-gradient-to-br from-stone-100 to-stone-200 border-2 border-stone-300 group-hover:from-stone-200 group-hover:to-stone-300'}`}
                    >
                      {/* Brillance */}
                      {wine && (
                        <div className="absolute top-1 left-1 w-1/3 h-1/3 bg-white/30 rounded-full blur-sm" />
                      )}

                      {/* Contenu */}
                      <div className="relative z-10 flex flex-col items-center gap-1">
                        {wine ? (
                          <>
                            <Wine size={16} className={wine.color === 'red' ? 'text-white/90' : 'text-stone-800/80'} />
                            <span className="text-[7px] font-bold">{wine.vintage}</span>
                          </>
                        ) : isOccupied ? (
                          <div className="text-stone-600 text-[8px] font-bold">Occupée</div>
                        ) : hasAwaitingBottles ? (
                          <Plus size={12} className="text-blue-500" />
                        ) : (
                          <Plus size={12} className="text-stone-400 opacity-40 group-hover:opacity-70 transition-all" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            </div>

            <div className="flex justify-center italic text-stone-400 text-[10px] gap-4 uppercase font-bold tracking-tighter">
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-bordeaux" /> Rouge</span>
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-300" /> Blanc</span>
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-200" /> Rosé</span>
            </div>
          </div>
        )}
      </div>

      {/* --- LONG PRESS POPOVER (Mobile) --- */}
      {!isHoverDevice && longPressPopover && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setLongPressPopover(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-4 max-w-xs animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-2">
              <h3 className="font-bold text-stone-800">{capitalize(longPressPopover.wine.name)}</h3>
              <p className="text-sm text-stone-600">{longPressPopover.wine.vintage}</p>
            </div>
          </div>
        </div>
      )}

      {/* --- HOVER TOOLTIP (PC) --- */}
      {isHoverDevice && hoverPopover && (
        <div className="fixed z-[200] bg-stone-900 text-white rounded-lg px-3 py-2 text-sm pointer-events-none animate-in fade-in duration-150" style={{ top: `${hoverPopover.mouseY - 60}px`, left: `${hoverPopover.mouseX}px`, transform: 'translateX(-50%)' }}>
          <div className="font-bold text-center">{capitalize(hoverPopover.wine.name)}</div>
          <div className="text-xs text-stone-300 text-center">{hoverPopover.wine.vintage}</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-stone-900"></div>
        </div>
      )}

      {/* --- MODAL AJOUT UNITE (Spec 8) --- */}
      {showAddUnit && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-serif font-bold text-stone-800 italic text-center">Nouveau Rangement</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 ml-2 uppercase">Nom du casier</label>
                <input 
                  autoFocus
                  className="w-full p-4 bg-stone-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-bordeaux/20" 
                  placeholder="Ex: Casier Nord" 
                  value={newUnit.name} 
                  onChange={e => setNewUnit({...newUnit, name: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 ml-2 uppercase">Colonnes (X)</label>
                  <input type="number" className="w-full p-4 bg-stone-50 rounded-2xl font-bold text-center" value={newUnit.width} onChange={e => setNewUnit({...newUnit, width: parseInt(e.target.value)})}/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 ml-2 uppercase">Lignes (Y)</label>
                  <input type="number" className="w-full p-4 bg-stone-50 rounded-2xl font-bold text-center" value={newUnit.height} onChange={e => setNewUnit({...newUnit, height: parseInt(e.target.value)})}/>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowAddUnit(false)} className="flex-1 py-4 text-stone-400 font-bold text-sm uppercase tracking-widest">Annuler</button>
              <button onClick={handleAddUnit} className="flex-1 py-4 bg-bordeaux text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-bordeaux/20 active:scale-95 transition-all">Créer</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DÉTAIL / ACTIONS (Spec 11) --- */}
      {viewingBottle && (() => {
        const wine = viewingBottle.wine || viewingBottle.wines
        return (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative animate-in zoom-in-95">
              <button onClick={() => { setViewingBottle(null); setShowFullPhoto(false) }} className="absolute top-6 right-6 text-stone-300 p-2"><X size={18} /></button>

              {/* Photo étiquette */}
              {wine?.image_url ? (
                <div className="rounded-[1.5rem] overflow-hidden cursor-pointer" onClick={() => setShowFullPhoto(true)}>
                  <img
                    src={wine.image_url}
                    alt="Étiquette"
                    className="w-full h-36 object-contain bg-stone-50 hover:scale-105 transition-transform duration-300"
                  />
                  <p className="text-center text-[9px] text-stone-400 uppercase font-bold mt-1 pb-1">Appuyer pour agrandir</p>
                </div>
              ) : (
                <div className={`inline-flex p-5 rounded-full shadow-inner mx-auto block text-center ${wine?.color === 'red' ? 'bg-bordeaux/5 text-bordeaux' : 'bg-amber-50 text-amber-600'}`}>
                  <Wine size={40} />
                </div>
              )}

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-serif font-bold text-stone-800 italic leading-tight">{wine?.name}</h2>
                <div className="flex justify-center gap-2">
                  <span className="px-3 py-1 bg-stone-100 rounded-full text-[10px] font-bold text-stone-500 uppercase">{wine?.vintage}</span>
                  {wine?.is_1859_classified && (
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                      <Star size={10} fill="currentColor" /> Classé 1859
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-y border-stone-50 py-6">
                <div className="text-center border-r border-stone-50">
                  <p className="text-[9px] text-stone-400 uppercase font-bold">Région</p>
                  <p className="text-xs font-bold text-stone-700">{wine?.region || 'N/A'}</p>
                </div>
                <div className="text-center border-r border-stone-50">
                  <p className="text-[9px] text-stone-400 uppercase font-bold">Appellation</p>
                  <p className="text-xs font-bold text-stone-700">{wine?.appellation || 'N/A'}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-stone-400 uppercase font-bold">Apogée</p>
                  <p className="text-xs font-bold text-bordeaux">{wine?.peak_date || 'N/A'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingBottle(viewingBottle)}
                  className="flex-1 py-4 border-2 border-stone-100 text-stone-400 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-50 hover:text-stone-600 hover:border-stone-200 transition-all active:scale-95 shadow-sm"
                >
                  <Pencil size={16} /> Modifier
                </button>
                <button
                  onClick={() => setShowConsumeModal(viewingBottle)}
                  className="flex-1 py-4 border-2 border-stone-100 text-stone-400 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all active:scale-95 shadow-sm"
                >
                  <Trash2 size={16} /> Sortir
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* --- PHOTO PLEIN ÉCRAN --- */}
      {showFullPhoto && (viewingBottle?.wine || viewingBottle?.wines)?.image_url && (
        <div
          className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowFullPhoto(false)}
        >
          <button className="absolute top-6 right-6 text-white/60 p-2"><X size={28} /></button>
          <img
            src={(viewingBottle.wine || viewingBottle.wines).image_url}
            alt="Étiquette plein écran"
            className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}

      {/* --- MODALS CONDITIONNELS --- */}
      {showConsumeModal && (
        <ConsumeModal
          wineName={(showConsumeModal.wine || showConsumeModal.wines)?.name}
          entryDate={showConsumeModal.created_at?.split('T')[0]}
          onConfirm={handleConfirmConsume}
          onCancel={() => setShowConsumeModal(null)}
        />
      )}
      
      {selectedPos && (
        <WineForm
          x={selectedPos.x}
          y={selectedPos.y}
          onSave={handleSaveWine}
          onCancel={() => setSelectedPos(null)}
        />
      )}

      {editingBottle && (
        <WineForm
          initialData={editingBottle.wine || editingBottle.wines}
          onSave={handleUpdateWine}
          onCancel={() => setEditingBottle(null)}
        />
      )}
    </div>
  )
}

