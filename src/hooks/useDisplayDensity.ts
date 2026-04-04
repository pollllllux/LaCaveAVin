import { useEffect, useState } from 'react'
import { fetchUserSettings, syncSettingsToLocalStorage } from '@/lib/settings-service'

type DisplayDensity = 'compact' | 'normal' | 'spacious'

export function useDisplayDensity() {
  const [density, setDensity] = useState<DisplayDensity>('normal')

  useEffect(() => {
    const loadDensity = async () => {
      // Try to load from DB first
      const settings = await fetchUserSettings()
      setDensity(settings.display_density)
      syncSettingsToLocalStorage(settings)
    }
    loadDensity()
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
