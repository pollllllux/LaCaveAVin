/**
 * Script pour peupler la table wine_peak_dates
 * À exécuter une seule fois: npx ts-node scripts/populate-wine-peak-dates.ts
 */

import { createClient } from '@supabase/supabase-js'
import { generateWinePeakDates } from '../src/lib/wine-peak-dates'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

async function populate() {
  console.log('🍷 Génération des données de vieillissement...')
  const entries = generateWinePeakDates()

  console.log(`📊 ${entries.length} entrées générées`)
  console.log('📤 Insertion dans Supabase...')

  // Insérer par batch de 100 pour éviter les timeouts
  const batchSize = 100
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize)
    const { error } = await supabase
      .from('wine_peak_dates')
      .insert(batch)

    if (error) {
      console.error(`❌ Erreur batch ${i / batchSize + 1}:`, error.message)
    } else {
      console.log(`✅ Batch ${i / batchSize + 1} inséré`)
    }
  }

  console.log('🎉 Données de vieillissement importées avec succès!')
}

populate().catch(console.error)
