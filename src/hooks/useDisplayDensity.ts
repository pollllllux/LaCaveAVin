import { useEffect, useState } from 'react'

type DisplayDensity = 'compact' | 'normal' | 'spacious'

export function useDisplayDensity() {
  const [density, setDensity] = useState<DisplayDensity>('normal')

  useEffect(() => {
    const savedDensity = localStorage.getItem('displayDensity') as DisplayDensity | null
    if (savedDensity) {
      setDensity(savedDensity)
    }
  }, [])

  const getDensityClass = () => {
    switch (density) {
      case 'compact':
        return 'density-compact'
      case 'spacious':
        return 'density-spacious'
      default:
        return 'density-normal'
    }
  }

  const spacing = {
    compact: {
      cardPadding: 'p-4',
      cardGap: 'gap-2',
      sectionGap: 'gap-4',
    },
    normal: {
      cardPadding: 'p-6',
      cardGap: 'gap-4',
      sectionGap: 'gap-6',
    },
    spacious: {
      cardPadding: 'p-8',
      cardGap: 'gap-6',
      sectionGap: 'gap-8',
    },
  }

  return {
    density,
    getDensityClass,
    spacing: spacing[density],
  }
}
