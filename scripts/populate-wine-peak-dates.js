/**
 * Script pour peupler la table wine_peak_dates
 * À exécuter une seule fois: node scripts/populate-wine-peak-dates.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes!')
  console.error('Assure-toi que .env.local existe et contient NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function generateWinePeakDates() {
  const entries = []
  const currentYear = new Date().getFullYear()

  const wineProfiles = [
    // FRANCE - Bordeaux
    ['France', 'Bordeaux', 'Pauillac', 25, 40],
    ['France', 'Bordeaux', 'Saint-Julien', 25, 40],
    ['France', 'Bordeaux', 'Margaux', 25, 40],
    ['France', 'Bordeaux', 'Saint-Estèphe', 20, 35],
    ['France', 'Bordeaux', 'Pomerol', 20, 35],
    ['France', 'Bordeaux', 'Saint-Émilion', 18, 30],
    ['France', 'Bordeaux', 'Pessac-Léognan', 15, 28],
    ['France', 'Bordeaux', 'Médoc', 12, 25],
    ['France', 'Bordeaux', 'Haut-Médoc', 12, 25],
    ['France', 'Bordeaux', 'Graves', 12, 25],
    ['France', 'Bordeaux', 'Sauternes', 20, 50],
    ['France', 'Bordeaux', 'Entre-Deux-Mers', 3, 8],
    ['France', 'Bordeaux', 'Bordeaux', 3, 8],

    // FRANCE - Bourgogne
    ['France', 'Bourgogne', 'Gevrey-Chambertin', 20, 35],
    ['France', 'Bourgogne', 'Vosne-Romanée', 20, 35],
    ['France', 'Bourgogne', 'Chambolle-Musigny', 15, 30],
    ['France', 'Bourgogne', 'Pommard', 15, 28],
    ['France', 'Bourgogne', 'Volnay', 12, 25],
    ['France', 'Bourgogne', 'Nuits-Saint-Georges', 12, 25],
    ['France', 'Bourgogne', 'Beaune', 10, 20],
    ['France', 'Bourgogne', 'Meursault', 15, 25],
    ['France', 'Bourgogne', 'Puligny-Montrachet', 15, 30],
    ['France', 'Bourgogne', 'Chassagne-Montrachet', 12, 25],
    ['France', 'Bourgogne', 'Chablis', 8, 15],
    ['France', 'Bourgogne', 'Bourgogne', 3, 10],

    // FRANCE - Champagne
    ['France', 'Champagne', 'Champagne', 10, 25],

    // FRANCE - Alsace
    ['France', 'Alsace', 'Alsace Grand Cru', 8, 20],
    ['France', 'Alsace', 'Alsace', 3, 8],

    // FRANCE - Rhône
    ['France', 'Rhône', 'Châteauneuf-du-Pape', 15, 30],
    ['France', 'Rhône', 'Hermitage', 15, 30],
    ['France', 'Rhône', 'Côte-Rôtie', 12, 25],
    ['France', 'Rhône', 'Cornas', 10, 20],
    ['France', 'Rhône', 'Saint-Joseph', 8, 15],
    ['France', 'Rhône', 'Condrieu', 3, 8],
    ['France', 'Rhône', 'Gigondas', 10, 20],
    ['France', 'Rhône', 'Côtes du Rhône', 3, 10],

    // FRANCE - Loire
    ['France', 'Loire', 'Sancerre', 4, 12],
    ['France', 'Loire', 'Pouilly-Fumé', 5, 15],
    ['France', 'Loire', 'Vouvray', 5, 20],
    ['France', 'Loire', 'Bourgueil', 5, 15],
    ['France', 'Loire', 'Chinon', 5, 15],
    ['France', 'Loire', 'Muscadet', 2, 5],
    ['France', 'Loire', 'Anjou', 3, 10],

    // FRANCE - Languedoc-Roussillon
    ['France', 'Languedoc-Roussillon', 'Languedoc', 3, 8],
    ['France', 'Languedoc-Roussillon', 'Minervois', 4, 10],
    ['France', 'Languedoc-Roussillon', 'Corbières', 4, 10],
    ['France', 'Languedoc-Roussillon', 'Banyuls', 10, 25],

    // FRANCE - Provence
    ['France', 'Provence', 'Bandol', 5, 15],
    ['France', 'Provence', 'Côtes de Provence', 2, 5],

    // FRANCE - Beaujolais
    ['France', 'Beaujolais', 'Moulin-à-Vent', 5, 12],
    ['France', 'Beaujolais', 'Morgon', 5, 12],
    ['France', 'Beaujolais', 'Beaujolais', 1, 4],

    // FRANCE - Sud-Ouest
    ['France', 'Sud-Ouest', 'Cahors', 8, 20],
    ['France', 'Sud-Ouest', 'Madiran', 8, 18],
    ['France', 'Sud-Ouest', 'Jurançon', 5, 15],

    // FRANCE - Autres
    ['France', 'Jura', 'Arbois', 5, 15],
    ['France', 'Normandie', 'Cidre', 2, 5],
    ['France', 'Bretagne', 'Cidre', 2, 5],

    // ITALIE - Toscane
    ['Italie', 'Toscane', 'Chianti Classico', 10, 20],
    ['Italie', 'Toscane', 'Brunello di Montalcino', 20, 40],
    ['Italie', 'Toscane', 'Vino Nobile di Montepulciano', 15, 30],
    ['Italie', 'Toscane', 'Chianti', 3, 10],

    // ITALIE - Piémont
    ['Italie', 'Piémont', 'Barolo', 20, 35],
    ['Italie', 'Piémont', 'Barbaresco', 18, 32],
    ['Italie', 'Piémont', 'Gavi', 3, 8],

    // ITALIE - Vénétie
    ['Italie', 'Vénétie', 'Amarone della Valpolicella', 20, 40],
    ['Italie', 'Vénétie', 'Soave', 3, 8],
    ['Italie', 'Vénétie', 'Prosecco', 1, 3],

    // ITALIE - Sicile
    ['Italie', 'Sicile', 'Nero d\'Avola', 5, 12],
    ['Italie', 'Sicile', 'Marsala', 10, 30],

    // ESPAGNE - Rioja
    ['Espagne', 'Rioja', 'Rioja DOCa', 10, 25],

    // ESPAGNE - Ribera del Duero
    ['Espagne', 'Ribera del Duero', 'Ribera del Duero DO', 10, 25],

    // ESPAGNE - Priorat
    ['Espagne', 'Priorat', 'Priorat DOQ', 8, 20],

    // ESPAGNE - Jerez
    ['Espagne', 'Jerez', 'Fino', 3, 8],
    ['Espagne', 'Jerez', 'Oloroso', 20, 40],

    // ESPAGNE - Autres
    ['Espagne', 'Penedès', 'Penedès DO', 3, 8],
    ['Espagne', 'Galice', 'Rías Baixas', 2, 6],

    // USA - Napa Valley
    ['États-Unis', 'Napa Valley', 'Napa Valley AVA', 10, 25],

    // USA - Sonoma
    ['États-Unis', 'Sonoma', 'Russian River Valley', 8, 15],
    ['États-Unis', 'Sonoma', 'Sonoma Coast', 8, 15],

    // USA - Oregon
    ['États-Unis', 'Oregon', 'Willamette Valley', 8, 18],

    // USA - Washington State
    ['États-Unis', 'Washington State', 'Columbia Valley AVA', 8, 20],

    // ALLEMAGNE
    ['Allemagne', 'Mosel', 'Bernkasteler Doctor', 8, 20],
    ['Allemagne', 'Rheingau', 'Rheingau QbA', 8, 18],
    ['Allemagne', 'Pfalz', 'Pfalz QbA', 5, 15],

    // AUTRICHE
    ['Autriche', 'Wachau', 'Wachau DAC', 8, 18],
    ['Autriche', 'Kremstal', 'Kremstal DAC', 7, 15],

    // GRÈCE
    ['Grèce', 'Santorin', 'Santorin AOC', 5, 15],
    ['Grèce', 'Naoussa', 'Naoussa AOC', 8, 20],
    ['Grèce', 'Némée', 'Nemea AOC', 5, 15],

    // AFRIQUE DU SUD
    ['Afrique du Sud', 'Stellenbosch', 'Stellenbosch WO', 8, 20],
    ['Afrique du Sud', 'Paarl', 'Paarl WO', 7, 18],
    ['Afrique du Sud', 'Constantia', 'Constantia WO', 8, 20],

    // ARGENTINE
    ['Argentine', 'Mendoza', 'Luján de Cuyo', 8, 20],

    // PORTUGAL
    ['Portugal', 'Douro', 'Porto', 20, 50],
    ['Portugal', 'Alentejo', 'Alentejo DOC', 5, 15],
  ]

  for (const [country, region, appellation, minYears, maxYears] of wineProfiles) {
    for (let vintage = 1989; vintage <= currentYear; vintage++) {
      // Calcul de la plage de consommation optimale
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

async function populate() {
  console.log('🍷 Génération des données de vieillissement...')
  const entries = generateWinePeakDates()

  console.log(`📊 ${entries.length} entrées générées`)
  console.log('📤 Insertion dans Supabase...')

  const batchSize = 100
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize)
    const { error } = await supabase
      .from('wine_peak_dates')
      .insert(batch)

    if (error) {
      console.error(`❌ Erreur batch ${Math.floor(i / batchSize) + 1}:`, error.message)
    } else {
      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} inséré (${batch.length} entrées)`)
    }
  }

  console.log('🎉 Données de vieillissement importées avec succès!')
}

populate().catch(console.error)
