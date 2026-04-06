type MaturityType = 'ready' | 'after5' | 'past' | 'unknown'

function BottleIcon({ isHorizontal = false, className = '' }: { isHorizontal?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 60"
      className={`w-5 h-6 ${isHorizontal ? 'rotate-90' : ''} ${className}`}
      fill="currentColor"
    >
      {/* Goulot long et fin */}
      <rect x="10" y="0" width="4" height="11" rx="0.5" />
      {/* Bouchon/Col */}
      <ellipse cx="12" cy="11" rx="2.5" ry="0.8" />
      {/* Épaulement bien marqué (caractéristique Bordeaux) */}
      <path d="M 10 11.8 L 8 14 Q 6 15.5 6 18 L 6 52 L 18 52 L 18 18 Q 18 15.5 16 14 L 14 11.8 Z" />
      {/* Reflet léger sur le corps */}
      <ellipse cx="8.5" cy="28" rx="1.2" ry="4" opacity="0.25" />
    </svg>
  )
}

export function MaturityIconStyled({ maturity }: { maturity: MaturityType }) {
  switch (maturity) {
    case 'ready':
      // Verticale vert bouteille (à boire tranquillement)
      return <span className="text-[#2d5016] inline-flex"><BottleIcon isHorizontal={false} /></span>

    case 'after5':
      // Horizontale grise (à conserver longtemps)
      return <span className="text-stone-400 inline-flex"><BottleIcon isHorizontal={true} /></span>

    case 'past':
      // Verticale vert bouteille clignotante (passé depuis >3 ans, faut la boire vite!)
      return (
        <span className="text-[#2d5016] animate-pulse inline-flex">
          <BottleIcon isHorizontal={false} />
        </span>
      )

    default:
      return <span>❓</span>
  }
}
