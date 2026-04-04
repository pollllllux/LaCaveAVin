type MaturityType = 'ready' | 'after5' | 'past' | 'unknown'

// Bouteille SVG réutilisable
function BottleIcon({ isHorizontal = false, className = '' }: { isHorizontal?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 40"
      className={`w-5 h-6 ${isHorizontal ? 'rotate-90' : ''} ${className}`}
      fill="currentColor"
    >
      {/* Goulot */}
      <rect x="8" y="0" width="4" height="6" />
      {/* Épaulement */}
      <path d="M 7 6 Q 7 8 6 10 L 6 14 Q 6 16 8 16 L 12 16 Q 14 16 14 14 L 14 10 Q 13 8 13 6 Z" />
      {/* Corps */}
      <path d="M 6 16 Q 5 20 5 28 Q 5 36 8 38 L 12 38 Q 15 36 15 28 Q 15 20 14 16" />
    </svg>
  )
}

export function MaturityIconStyled({ maturity }: { maturity: MaturityType }) {
  switch (maturity) {
    case 'ready':
      // Horizontale vert bouteille (à boire tranquillement)
      return <div className="text-[#2d5016]"><BottleIcon isHorizontal={true} /></div>

    case 'after5':
      // Verticale grise (à conserver longtemps)
      return <div className="text-stone-400"><BottleIcon isHorizontal={false} /></div>

    case 'past':
      // Horizontale vert bouteille clignotante (passé depuis >3 ans, faut la boire vite!)
      return (
        <div className="text-[#2d5016] animate-pulse">
          <BottleIcon isHorizontal={true} />
        </div>
      )

    default:
      return <span>❓</span>
  }
}
