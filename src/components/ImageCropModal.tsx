"use client"

import { useState, useRef, useEffect } from 'react'
import { X, Crop } from 'lucide-react'

interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

interface ImageCropModalProps {
  imageUrl: string
  imageFile: File
  onCropComplete: (croppedFile: File) => void
  onCancel: () => void
}

export default function ImageCropModal({ imageUrl, imageFile, onCropComplete, onCancel }: ImageCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 })
  const [draggingCorner, setDraggingCorner] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [scale, setScale] = useState(1)
  const [displayDims, setDisplayDims] = useState({ width: 0, height: 0 })

  // Charge l'image et affiche sur le canvas
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      // Calculer les dimensions en tenant compte de l'espace disponible
      // Header (~80px) + padding (~32px) + buttons (~80px) + gaps (~24px) = ~216px d'overhead
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const overhead = 220 // Header + padding + buttons + gaps
      const maxAvailableHeight = viewportHeight - overhead

      // Limiter à 90% de la largeur pour laisser du padding
      const maxWidth = Math.min(600, viewportWidth * 0.9)
      const maxHeight = maxAvailableHeight

      const ratio = img.width / img.height
      let displayWidth = maxWidth
      let displayHeight = displayWidth / ratio

      if (displayHeight > maxHeight) {
        displayHeight = maxHeight
        displayWidth = displayHeight * ratio
      }

      // Dimensionner et remplir le canvas
      canvas.width = displayWidth
      canvas.height = displayHeight

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      // Dessiner l'image
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight)

      // Stocker l'échelle
      setScale(img.width / displayWidth)
      setDisplayDims({ width: displayWidth, height: displayHeight })

      // Détection des bords (Canny simplifié)
      const detectedRect = detectLabelBounds(ctx, displayWidth, displayHeight, img)
      setCropRect(detectedRect)
      setImageLoaded(true)
    }

    img.onerror = () => {
      console.error('Erreur chargement image')
      // Fallback: utiliser les dimensions de la zone centrale
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = 600
        canvas.height = 800
        setCropRect({
          x: 60,
          y: 120,
          width: 480,
          height: 560,
        })
        setImageLoaded(true)
      }
    }

    img.src = imageUrl
  }, [imageUrl])

  // Algorithme simplifié de détection des bords
  const detectLabelBounds = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    img: HTMLImageElement
  ): CropRect => {
    try {
      const imageData = ctx.getImageData(0, 0, width, height)
      const data = imageData.data

      // Convertir en niveaux de gris
      const gray: number[] = []
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        gray.push(0.299 * r + 0.587 * g + 0.114 * b)
      }

      // Détection des contours
      let minX = width,
        maxX = 0,
        minY = height,
        maxY = 0

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x
          let isEdge = false

          // Détecte les changements de contraste
          if (x > 0 && x < width - 1) {
            const diffX = Math.abs(gray[idx + 1] - gray[idx - 1])
            isEdge = diffX > 30
          }
          if (y > 0 && y < height - 1 && !isEdge) {
            const diffY = Math.abs(gray[idx + width] - gray[idx - width])
            isEdge = diffY > 30
          }

          if (isEdge) {
            minX = Math.min(minX, x)
            maxX = Math.max(maxX, x)
            minY = Math.min(minY, y)
            maxY = Math.max(maxY, y)
          }
        }
      }

      // Utiliser la détection si elle est viable
      const detectedWidth = maxX - minX
      const detectedHeight = maxY - minY

      if (detectedWidth > 50 && detectedHeight > 50) {
        const margin = 40 // Augmenter la marge pour visibilité
        const safetyMargin = 20 // Marge de sécurité pour garder le cadre visible

        const x = Math.max(safetyMargin, minX - margin)
        const y = Math.max(safetyMargin, minY - margin)
        const maxRectWidth = width - safetyMargin * 2
        const maxRectHeight = height - safetyMargin * 2

        return {
          x,
          y,
          width: Math.min(maxRectWidth, detectedWidth + margin * 2),
          height: Math.min(maxRectHeight, detectedHeight + margin * 2),
        }
      }
    } catch (e) {
      console.error('Erreur détection bords:', e)
    }

    // Fallback: région centrale avec marge de sécurité
    const safetyMargin = 20
    return {
      x: safetyMargin + width * 0.05,
      y: safetyMargin + height * 0.1,
      width: width - (safetyMargin * 2 + width * 0.1),
      height: height - (safetyMargin * 2 + height * 0.25),
    }
  }

  // Redessiner le canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageLoaded) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      // Dessiner l'image complètement
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Assombrir avec un rectangle pour chaque zone en dehors du crop
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'

      // Haut
      if (cropRect.y > 0) {
        ctx.fillRect(0, 0, canvas.width, cropRect.y)
      }

      // Bas
      if (cropRect.y + cropRect.height < canvas.height) {
        ctx.fillRect(0, cropRect.y + cropRect.height, canvas.width, canvas.height - (cropRect.y + cropRect.height))
      }

      // Gauche
      if (cropRect.x > 0) {
        ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.height)
      }

      // Droite
      if (cropRect.x + cropRect.width < canvas.width) {
        ctx.fillRect(cropRect.x + cropRect.width, cropRect.y, canvas.width - (cropRect.x + cropRect.width), cropRect.height)
      }

      // Cadre du crop en bordeaux
      ctx.strokeStyle = '#991b1b'
      ctx.lineWidth = 3
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height)

      // Coins draggables
      const cornerSize = 12
      const corners = [
        { x: cropRect.x, y: cropRect.y },
        { x: cropRect.x + cropRect.width, y: cropRect.y },
        { x: cropRect.x, y: cropRect.y + cropRect.height },
        { x: cropRect.x + cropRect.width, y: cropRect.y + cropRect.height },
      ]

      corners.forEach((corner) => {
        ctx.fillStyle = '#991b1b'
        ctx.fillRect(
          corner.x - cornerSize / 2,
          corner.y - cornerSize / 2,
          cornerSize,
          cornerSize
        )
      })
    }
    img.src = imageUrl
  }, [cropRect, imageLoaded, imageUrl])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageLoaded) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cornerSize = 12

    const corners = [
      { key: 'tl', x: cropRect.x, y: cropRect.y },
      { key: 'tr', x: cropRect.x + cropRect.width, y: cropRect.y },
      { key: 'bl', x: cropRect.x, y: cropRect.y + cropRect.height },
      { key: 'br', x: cropRect.x + cropRect.width, y: cropRect.y + cropRect.height },
    ]

    for (const corner of corners) {
      if (
        Math.abs(x - corner.x) < cornerSize &&
        Math.abs(y - corner.y) < cornerSize
      ) {
        setDraggingCorner(corner.key)
        return
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingCorner || !imageLoaded) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const minWidth = 50
    const minHeight = 50
    const safetyMargin = 15 // Marge pour garder le cadre visible

    switch (draggingCorner) {
      case 'tl':
        setCropRect((prev) => ({
          ...prev,
          x: Math.max(safetyMargin, Math.min(x, prev.x + prev.width - minWidth)),
          y: Math.max(safetyMargin, Math.min(y, prev.y + prev.height - minHeight)),
          width: Math.max(minWidth, prev.width - (x - prev.x)),
          height: Math.max(minHeight, prev.height - (y - prev.y)),
        }))
        break
      case 'tr':
        setCropRect((prev) => ({
          ...prev,
          y: Math.max(safetyMargin, Math.min(y, prev.y + prev.height - minHeight)),
          width: Math.max(minWidth, Math.min(x - prev.x, displayDims.width - prev.x - safetyMargin)),
          height: Math.max(minHeight, prev.height - (y - prev.y)),
        }))
        break
      case 'bl':
        setCropRect((prev) => ({
          ...prev,
          x: Math.max(safetyMargin, Math.min(x, prev.x + prev.width - minWidth)),
          width: Math.max(minWidth, prev.width - (x - prev.x)),
          height: Math.max(minHeight, Math.min(y - prev.y, displayDims.height - prev.y - safetyMargin)),
        }))
        break
      case 'br':
        setCropRect((prev) => ({
          ...prev,
          width: Math.max(minWidth, Math.min(x - prev.x, displayDims.width - prev.x - safetyMargin)),
          height: Math.max(minHeight, Math.min(y - prev.y, displayDims.height - prev.y - safetyMargin)),
        }))
        break
    }
  }

  const handleMouseUp = () => {
    setDraggingCorner(null)
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!imageLoaded) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const touch = e.touches[0]
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    const cornerSize = 24 // Plus grand pour mobile

    const corners = [
      { key: 'tl', x: cropRect.x, y: cropRect.y },
      { key: 'tr', x: cropRect.x + cropRect.width, y: cropRect.y },
      { key: 'bl', x: cropRect.x, y: cropRect.y + cropRect.height },
      { key: 'br', x: cropRect.x + cropRect.width, y: cropRect.y + cropRect.height },
    ]

    for (const corner of corners) {
      if (
        Math.abs(x - corner.x) < cornerSize &&
        Math.abs(y - corner.y) < cornerSize
      ) {
        setDraggingCorner(corner.key)
        return
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!draggingCorner || !imageLoaded) return
    e.preventDefault()

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const touch = e.touches[0]
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    const minWidth = 50
    const minHeight = 50
    const safetyMargin = 15

    switch (draggingCorner) {
      case 'tl':
        setCropRect((prev) => ({
          ...prev,
          x: Math.max(safetyMargin, Math.min(x, prev.x + prev.width - minWidth)),
          y: Math.max(safetyMargin, Math.min(y, prev.y + prev.height - minHeight)),
          width: Math.max(minWidth, prev.width - (x - prev.x)),
          height: Math.max(minHeight, prev.height - (y - prev.y)),
        }))
        break
      case 'tr':
        setCropRect((prev) => ({
          ...prev,
          y: Math.max(safetyMargin, Math.min(y, prev.y + prev.height - minHeight)),
          width: Math.max(minWidth, Math.min(x - prev.x, displayDims.width - prev.x - safetyMargin)),
          height: Math.max(minHeight, prev.height - (y - prev.y)),
        }))
        break
      case 'bl':
        setCropRect((prev) => ({
          ...prev,
          x: Math.max(safetyMargin, Math.min(x, prev.x + prev.width - minWidth)),
          width: Math.max(minWidth, prev.width - (x - prev.x)),
          height: Math.max(minHeight, Math.min(y - prev.y, displayDims.height - prev.y - safetyMargin)),
        }))
        break
      case 'br':
        setCropRect((prev) => ({
          ...prev,
          width: Math.max(minWidth, Math.min(x - prev.x, displayDims.width - prev.x - safetyMargin)),
          height: Math.max(minHeight, Math.min(y - prev.y, displayDims.height - prev.y - safetyMargin)),
        }))
        break
    }
  }

  const handleTouchEnd = () => {
    setDraggingCorner(null)
  }

  const cropAndSave = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Créer un canvas pour le crop final
    const cropCanvas = document.createElement('canvas')
    const scaledRect = {
      x: cropRect.x * scale,
      y: cropRect.y * scale,
      width: cropRect.width * scale,
      height: cropRect.height * scale,
    }

    cropCanvas.width = scaledRect.width
    cropCanvas.height = scaledRect.height

    const ctx = cropCanvas.getContext('2d')
    if (!ctx) return

    const fullImg = new Image()
    fullImg.crossOrigin = 'anonymous'
    fullImg.onload = () => {
      ctx.drawImage(
        fullImg,
        scaledRect.x,
        scaledRect.y,
        scaledRect.width,
        scaledRect.height,
        0,
        0,
        scaledRect.width,
        scaledRect.height
      )

      cropCanvas.toBlob((blob) => {
        if (!blob) return
        const croppedFile = new File([blob], imageFile.name, { type: imageFile.type })
        onCropComplete(croppedFile)
      }, imageFile.type, 0.95)
    }
    fullImg.src = imageUrl
  }

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl max-h-screen rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-serif font-bold text-stone-800 italic">Recadrer l'étiquette</h2>
            <p className="text-[10px] text-stone-400 uppercase font-bold mt-1">Ajustez les coins si nécessaire</p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={24} className="text-stone-600" />
          </button>
        </div>

        <div className="bg-stone-50 rounded-2xl overflow-hidden flex-1 flex items-center justify-center min-h-0">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="max-w-full max-h-full cursor-crosshair block touch-none"
          />
        </div>

        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-2xl font-bold hover:bg-stone-200 transition-all text-sm"
          >
            Annuler
          </button>
          <button
            onClick={cropAndSave}
            className="flex-1 py-3 bg-bordeaux text-white rounded-2xl font-bold shadow-lg shadow-bordeaux/20 hover:bg-stone-800 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Crop size={16} />
            Valider
          </button>
        </div>
      </div>
    </div>
  )
}
