/**
 * Données de vieillissement optimal par combinaison pays/région/appellation/millésime
 * À partir du millésime 1989
 */

export interface PeakDateEntry {
  country: string
  region: string
  appellation: string
  vintage: number
  peak_date_start: number
  peak_date_end: number
}

/**
 * Génère les données de vieillissement pour tous les millésimes (1989-2026)
 * Basé sur les profils réalistes de vieillissement des vins
 */
export function generateWinePeakDates(): PeakDateEntry[] {
  const entries: PeakDateEntry[] = []
  const currentYear = new Date().getFullYear()

  // Profils de vieillissement par région/appellation (en années depuis le millésime)
  const wineProfiles: Array<[string, string, string, number, number]> = [
    // FRANCE - BORDEAUX
    ['France', 'Bordeaux', 'Pauillac', 10, 35],
    ['France', 'Bordeaux', 'Saint-Julien', 10, 35],
    ['France', 'Bordeaux', 'Margaux', 10, 35],
    ['France', 'Bordeaux', 'Saint-Estèphe', 10, 32],
    ['France', 'Bordeaux', 'Pomerol', 10, 30],
    ['France', 'Bordeaux', 'Saint-Émilion', 9, 28],
    ['France', 'Bordeaux', 'Pessac-Léognan', 8, 25],
    ['France', 'Bordeaux', 'Médoc', 7, 20],
    ['France', 'Bordeaux', 'Haut-Médoc', 7, 20],
    ['France', 'Bordeaux', 'Graves', 7, 20],
    ['France', 'Bordeaux', 'Sauternes', 15, 60],
    ['France', 'Bordeaux', 'Entre-Deux-Mers', 2, 8],
    ['France', 'Bordeaux', 'Bordeaux', 2, 8],

    // FRANCE - BOURGOGNE
    ['France', 'Bourgogne', 'Gevrey-Chambertin', 10, 30],
    ['France', 'Bourgogne', 'Vosne-Romanée', 10, 30],
    ['France', 'Bourgogne', 'Chambolle-Musigny', 8, 25],
    ['France', 'Bourgogne', 'Pommard', 8, 25],
    ['France', 'Bourgogne', 'Volnay', 8, 25],
    ['France', 'Bourgogne', 'Nuits-Saint-Georges', 8, 25],
    ['France', 'Bourgogne', 'Beaune', 8, 25],
    ['France', 'Bourgogne', 'Meursault', 8, 20],
    ['France', 'Bourgogne', 'Puligny-Montrachet', 10, 25],
    ['France', 'Bourgogne', 'Chassagne-Montrachet', 8, 20],
    ['France', 'Bourgogne', 'Chablis', 4, 12],
    ['France', 'Bourgogne', 'Bourgogne', 2, 8],

    // FRANCE - CHAMPAGNE (peut être bu de suite)
    ['France', 'Champagne', 'Champagne', 0, 20],

    // FRANCE - ALSACE
    ['France', 'Alsace', 'Alsace Grand Cru', 5, 15],
    ['France', 'Alsace', 'Alsace', 2, 6],

    // FRANCE - RHÔNE
    ['France', 'Rhône', 'Châteauneuf-du-Pape', 8, 25],
    ['France', 'Rhône', 'Hermitage', 10, 30],
    ['France', 'Rhône', 'Côte-Rôtie', 8, 25],
    ['France', 'Rhône', 'Cornas', 8, 20],
    ['France', 'Rhône', 'Saint-Joseph', 5, 15],
    ['France', 'Rhône', 'Condrieu', 2, 8],
    ['France', 'Rhône', 'Gigondas', 6, 18],
    ['France', 'Rhône', 'Côtes du Rhône', 2, 8],

    // FRANCE - LOIRE
    ['France', 'Loire', 'Sancerre', 2, 10],
    ['France', 'Loire', 'Pouilly-Fumé', 3, 12],
    ['France', 'Loire', 'Vouvray', 3, 15],
    ['France', 'Loire', 'Bourgueil', 3, 12],
    ['France', 'Loire', 'Chinon', 3, 12],
    ['France', 'Loire', 'Muscadet', 1, 4],
    ['France', 'Loire', 'Anjou', 2, 8],

    // FRANCE - LANGUEDOC-ROUSSILLON
    ['France', 'Languedoc-Roussillon', 'Languedoc', 2, 8],
    ['France', 'Languedoc-Roussillon', 'Minervois', 3, 10],
    ['France', 'Languedoc-Roussillon', 'Corbières', 3, 10],
    ['France', 'Languedoc-Roussillon', 'Banyuls', 8, 25],

    // FRANCE - PROVENCE
    ['France', 'Provence', 'Bandol', 5, 15],
    ['France', 'Provence', 'Côtes de Provence', 1, 4],

    // FRANCE - BEAUJOLAIS
    ['France', 'Beaujolais', 'Moulin-à-Vent', 4, 12],
    ['France', 'Beaujolais', 'Morgon', 4, 12],
    ['France', 'Beaujolais', 'Beaujolais', 1, 3],

    // FRANCE - SUD-OUEST
    ['France', 'Sud-Ouest', 'Cahors', 5, 20],
    ['France', 'Sud-Ouest', 'Madiran', 5, 18],
    ['France', 'Sud-Ouest', 'Jurançon', 3, 12],

    // FRANCE - AUTRES
    ['France', 'Jura', 'Arbois', 4, 15],
    ['France', 'Normandie', 'Cidre', 1, 3],
    ['France', 'Bretagne', 'Cidre', 1, 3],

    // ITALIE - TOSCANE
    ['Italie', 'Toscane', 'Brunello di Montalcino', 12, 40],
    ['Italie', 'Toscane', 'Vino Nobile di Montepulciano', 10, 30],
    ['Italie', 'Toscane', 'Chianti Classico', 6, 20],
    ['Italie', 'Toscane', 'Chianti', 2, 8],

    // ITALIE - PIÉMONT
    ['Italie', 'Piémont', 'Barolo', 12, 35],
    ['Italie', 'Piémont', 'Barbaresco', 10, 32],
    ['Italie', 'Piémont', 'Gavi', 2, 6],

    // ITALIE - VÉNÉTIE
    ['Italie', 'Vénétie', 'Amarone della Valpolicella', 10, 35],
    ['Italie', 'Vénétie', 'Soave', 2, 6],
    ['Italie', 'Vénétie', 'Prosecco', 1, 2],

    // ITALIE - SICILE
    ['Italie', 'Sicile', 'Nero d\'Avola', 3, 10],
    ['Italie', 'Sicile', 'Marsala', 10, 30],

    // ESPAGNE - RIOJA
    ['Espagne', 'Rioja', 'Rioja DOCa', 8, 25],

    // ESPAGNE - RIBERA DEL DUERO
    ['Espagne', 'Ribiera del Duero', 'Ribiera del Duero DO', 8, 25],

    // ESPAGNE - PRIORAT
    ['Espagne', 'Priorat', 'Priorat DOQ', 8, 20],

    // ESPAGNE - JEREZ
    ['Espagne', 'Jerez', 'Fino', 2, 6],
    ['Espagne', 'Jerez', 'Oloroso', 15, 40],

    // ESPAGNE - AUTRES
    ['Espagne', 'Penedès', 'Penedès DO', 2, 8],
    ['Espagne', 'Galice', 'Rías Baixas', 1, 5],

    // USA - NAPA VALLEY
    ['États-Unis', 'Napa Valley', 'Napa Valley AVA', 8, 25],

    // USA - SONOMA
    ['États-Unis', 'Sonoma', 'Russian River Valley', 5, 15],
    ['États-Unis', 'Sonoma', 'Sonoma Coast', 5, 15],

    // USA - OREGON
    ['États-Unis', 'Oregon', 'Willamette Valley', 6, 18],

    // USA - WASHINGTON STATE
    ['États-Unis', 'Washington State', 'Columbia Valley AVA', 6, 20],

    // ALLEMAGNE
    ['Allemagne', 'Mosel', 'Bernkasteler Doctor', 5, 15],
    ['Allemagne', 'Rheingau', 'Rheingau QbA', 5, 15],
    ['Allemagne', 'Pfalz', 'Pfalz QbA', 3, 12],

    // AUTRICHE
    ['Autriche', 'Wachau', 'Wachau DAC', 5, 12],
    ['Autriche', 'Kremstal', 'Kremstal DAC', 4, 10],

    // GRÈCE
    ['Grèce', 'Santorin', 'Santorin AOC', 3, 12],
    ['Grèce', 'Naoussa', 'Naoussa AOC', 5, 18],
    ['Grèce', 'Némée', 'Nemea AOC', 3, 12],

    // AFRIQUE DU SUD
    ['Afrique du Sud', 'Stellenbosch', 'Stellenbosch WO', 7, 20],
    ['Afrique du Sud', 'Paarl', 'Paarl WO', 6, 18],
    ['Afrique du Sud', 'Constantia', 'Constantia WO', 7, 20],

    // ARGENTINE
    ['Argentine', 'Mendoza', 'Luján de Cuyo', 6, 18],

    // PORTUGAL
    ['Portugal', 'Douro', 'Porto', 20, 60],
    ['Portugal', 'Alentejo', 'Alentejo DOC', 3, 12],
  ]

  // Générer les données pour chaque millésime de 1989 à l'année actuelle
  for (const [country, region, appellation, minYears, maxYears] of wineProfiles) {
    for (let vintage = 1989; vintage <= currentYear; vintage++) {
      // Plage de consommation optimale
      const peakStart = vintage + minYears
      const peakEnd = vintage + maxYears

      entries.push({
        country,
        region,
        appellation,
        vintage,
        peak_date_start: peakStart,
        peak_date_end: peakEnd,
      })
    }
  }

  return entries
}

/**
 * Applique le facteur de qualité du millésime à la plage de vieillissement
 * @param minYears Années minimales de vieillissement
 * @param maxYears Années maximales de vieillissement
 * @param quality 'weak' | 'normal' | 'good'
 * @returns [minYearsAdjusted, maxYearsAdjusted]
 */
export function applyVintageQualityFactor(
  minYears: number,
  maxYears: number,
  quality: 'weak' | 'normal' | 'good'
): [number, number] {
  switch (quality) {
    case 'weak':
      // Réduire de 20% sur les deux dates
      return [
        Math.round(minYears * 0.8),
        Math.round(maxYears * 0.8),
      ]
    case 'good':
      // Augmenter de 30% uniquement sur la fin, pas sur le début
      return [
        minYears,
        Math.round(maxYears * 1.3),
      ]
    case 'normal':
    default:
      // Pas de changement
      return [minYears, maxYears]
  }
}

/**
 * Cherche la plage de maturité optimale pour un vin
 * Retourne la plage [start, end] ajustée selon la qualité du millésime
 */
export async function getPeakDate(
  country: string | null,
  region: string | null,
  appellation: string | null,
  vintage: number | null,
  supabaseClient: any,
  vintageQuality: 'weak' | 'normal' | 'good' = 'normal'
): Promise<[number, number]> {
  const currentYear = new Date().getFullYear()

  // Si infos manquantes, retourner plage par défaut (8 à 20 ans)
  if (!country || !region || !vintage) {
    return [currentYear + 8, currentYear + 20]
  }

  try {
    const { data, error } = await supabaseClient
      .from('wine_peak_dates')
      .select('peak_date_start, peak_date_end')
      .eq('country', country)
      .eq('region', region)
      .eq('appellation', appellation || '')
      .eq('vintage', vintage)
      .single()

    if (error || !data) {
      // Pas trouvé : chercher sans appellation (région seule)
      const { data: regionData } = await supabaseClient
        .from('wine_peak_dates')
        .select('peak_date_start, peak_date_end')
        .eq('country', country)
        .eq('region', region)
        .eq('vintage', vintage)
        .limit(1)
        .single()

      if (regionData) {
        // Calculer les années min/max depuis le millésime
        const minYears = regionData.peak_date_start - vintage
        const maxYears = regionData.peak_date_end - vintage

        // Appliquer le facteur de qualité
        const [adjustedMin, adjustedMax] = applyVintageQualityFactor(minYears, maxYears, vintageQuality)

        // Recalculer les années absolues
        const adjustedStart = vintage + adjustedMin
        const adjustedEnd = vintage + adjustedMax

        // Retourner la plage ajustée
        return [adjustedStart, adjustedEnd]
      }

      // Fallback : plage par défaut
      return [currentYear + 8, currentYear + 20]
    }

    // Calculer les années min/max depuis le millésime
    const minYears = data.peak_date_start - vintage
    const maxYears = data.peak_date_end - vintage

    // Appliquer le facteur de qualité
    const [adjustedMin, adjustedMax] = applyVintageQualityFactor(minYears, maxYears, vintageQuality)

    // Recalculer les années absolues
    const adjustedStart = vintage + adjustedMin
    const adjustedEnd = vintage + adjustedMax

    // Retourner la plage ajustée
    return [adjustedStart, adjustedEnd]
  } catch (error) {
    console.error('Erreur recherche peak_date:', error)
    return [currentYear + 8, currentYear + 20]
  }
}
