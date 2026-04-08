import imageCompression from 'browser-image-compression';


// ─── Interface pour résultat structuré ────────────────────────────────────
export interface RecognitionResult {
  text: string;
  rawText: string;
  domaine: string;
  vintage: number | null;
  appellation: string;
  region: string;
  country: string;
}

// ─── Vérification et correction du vin via API route ────────────────────
async function verifyAndCorrectWineName(
  domaine: string,
  appellation: string,
  country: string,
  supabaseClient?: any
): Promise<string> {
  console.log(`🔍 Vérification du nom via Claude Vision...`);

  try {
    const response = await fetch('/api/verify-wine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domaine, appellation, country }),
    });

    if (!response.ok) {
      console.warn('⚠️ Vérification échouée, garder le nom original');
      return domaine;
    }

    const data = await response.json();
    const correctedName = data.correctedName || domaine;

    if (correctedName !== domaine) {
      console.log(`✅ Nom corrigé: ${correctedName}`);
    }

    // Insérer dans wine_catalog si confirmé et non-existant
    if (correctedName !== 'INEXISTANT' && supabaseClient) {
      console.log(`💾 Vérification si déjà dans wine_catalog: ${correctedName}`);

      try {
        // Vérifier si le vin existe déjà
        const { data: existing } = await supabaseClient
          .from('wine_catalog')
          .select('winery')
          .ilike('winery', `%${correctedName}%`)
          .limit(1);

        if (!existing || existing.length === 0) {
          console.log(`➕ Vin absent, insertion dans wine_catalog: ${correctedName}`);
          await supabaseClient.from('wine_catalog').insert({
            winery: correctedName,
            country: country,
            region_1: appellation,
            variety: appellation,
            province: '',
          });
          console.log(`✅ Vin inséré dans wine_catalog`);
        } else {
          console.log(`ℹ️ Vin déjà présent dans wine_catalog`);
        }
      } catch (insertError) {
        console.warn(`⚠️ Erreur lors de l'insertion:`, insertError);
      }
    }

    return correctedName;
  } catch (error) {
    console.warn('⚠️ Erreur vérification, garder le nom original:', error);
    return domaine;
  }
}

// ─── Claude Vision pour reconnaissance d'étiquette ──────────────────────────
async function recognizeWithClaudeVision(imageFile: File): Promise<RecognitionResult> {
  // Appeler l'API route Next.js (pas de problème CORS)
  const formData = new FormData();
  formData.append('file', imageFile);

  console.log('🔄 Appel Claude Vision...');

  const response = await fetch('/api/recognize-wine', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Recognition failed');
  }

  const data = await response.json();
  const rawText = data.rawText || data.text; // Texte brut complet pour classement
  let text = data.text;

  console.log('✅ Réponse Claude Vision reçue');
  console.log('─'.repeat(60));
  console.log(text);
  console.log('─'.repeat(60));

  // Parser la réponse structurée
  const lines = text.split('\n').filter((l: string) => l.trim());
  const parsed: Record<string, string> = {};
  for (const line of lines) {
    const [key, value] = line.split(':').map((s: string) => s.trim());
    if (key && value) {
      parsed[key.toLowerCase()] = value;
    }
  }

  let domaine = parsed.domaine || '';
  const vintage = parsed.vintage ? parseInt(parsed.vintage) : null;
  const appellation = parsed.appellation || '';
  const region = parsed.region || '';
  const country = parsed.pays || '';

  console.log('📋 Données extraites:');
  console.log(`  🏰 Domaine: ${domaine}`);
  console.log(`  📅 Millésime: ${vintage}`);
  console.log(`  🍷 Appellation: ${appellation}`);
  console.log(`  📍 Région: ${region}`);
  console.log(`  🌍 Pays: ${country}`);

  // Exporter la fonction pour utilisation en fallback
  return {
    text: `${domaine}\n${appellation}\n${region}\n${vintage || ''}\n${country}`,
    rawText, // Garder le texte brut original pour détection classement
    domaine,
    vintage,
    appellation,
    region,
    country,
  };
}

// ─── Détection du classement 1859 ──────────────────────────────────────────
export function detectClassement1859(text: string, region: string, appellation: string): boolean {
  console.log(`🔎 Détection classement - Région: ${region}, Appellation: ${appellation}`);
  console.log(`🔎 Texte brut: "${text.substring(0, 150)}..."`);

  const isBordeaux =
    region?.toLowerCase().includes('bordeaux') ||
    appellation?.toLowerCase().includes('bordeaux') ||
    ['pauillac', 'saint-julien', 'margaux', 'saint-estèphe', 'saint-émilion', 'pomerol', 'graves', 'sauternes'].some(
      r => appellation?.toLowerCase().includes(r) || region?.toLowerCase().includes(r)
    );

  console.log(`🔎 Est Bordeaux: ${isBordeaux}`);

  if (!isBordeaux) {
    console.log('❌ Pas un Bordeaux');
    return false;
  }

  const classementPatterns = [
    'grand cru classé',
    'grand vin classé',
    'cru classé en 1855',
    'classement:',
    '1er cru',
    '1ère cru',
    'premier cru',
    '2ème cru',
    '2e cru',
    'deuxième cru',
    'cru classé',
    'classé 1859',
    'classé 1855',
  ];

  const lowerText = text.toLowerCase();
  const found = classementPatterns.some(pattern => {
    const match = lowerText.includes(pattern);
    if (match) console.log(`  ✅ Pattern trouvé: "${pattern}"`);
    return match;
  });

  if (found) {
    console.log(`⭐ CLASSEMENT DÉTECTÉ!`);
  } else {
    console.log(`❌ Aucun classement détecté`);
  }

  return found;
}

export { verifyAndCorrectWineName };

export async function processBottleImage(file: File) {
  // Spec 16: Compression < 200Ko
  const options = { maxSizeMB: 0.19, maxWidthOrHeight: 1200, useWebWorker: true };
  const compressedFile = await imageCompression(file, options);

  // Claude Vision pour reconnaissance (via API route)
  const recognition = await recognizeWithClaudeVision(compressedFile);

  return {
    text: recognition.text,
    rawText: recognition.rawText,
    compressedFile,
    domaine: recognition.domaine,
    vintage: recognition.vintage,
    appellation: recognition.appellation,
    region: recognition.region,
    country: recognition.country,
  };
}

const DOMAIN_KEYWORDS = [
  'château', 'chateau', 'domaine', 'mas', 'clos', 'maison', 'cave',
  'abbaye', 'prieuré', 'prieure', 'vignoble', 'vignobles', 'moulin',
  'comte', 'comtesse', 'marquis', 'baron', 'baronnie', 'castle',
  'weingut', 'bodega', 'tenuta', 'quinta',
]

export function extractDomainFromOCR(text: string): string {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length >= 3 && l.length <= 60)
    .filter(l => !/^\d+$/.test(l))

  if (lines.length === 0) return ''

  const lowerLines = lines.map(l => l.toLowerCase())
  const keywordLine = lines.find((_, i) =>
    DOMAIN_KEYWORDS.some(kw => lowerLines[i].includes(kw))
  )
  if (keywordLine) return keywordLine

  // Fallback : ligne la plus longue (souvent le nom du domaine)
  return lines.reduce((a, b) => (b.length > a.length ? b : a), '')
}

export function extractVintageFromOCR(text: string): number | null {
  const currentYear = new Date().getFullYear()
  const matches = text.match(/\b(19\d{2}|20[0-2]\d)\b/g)
  if (!matches) return null
  const years = matches
    .map(Number)
    .filter(y => y >= 1900 && y <= currentYear)
  if (years.length === 0) return null
  // S'il y en a plusieurs, on prend le plus récent (millésime le plus probable)
  return Math.max(...years)
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
}

export function extractAppellationFromOCR(
  text: string,
  regionsByCountry: Record<string, string[]>,
  appellationsByRegion: Record<string, string[]>
): { country: string; region: string; appellation: string } | null {
  const normalizedText = normalize(text)

  // Appellations en premier (plus spécifiques)
  for (const [country, regions] of Object.entries(regionsByCountry)) {
    for (const region of regions) {
      for (const appellation of (appellationsByRegion[region] ?? [])) {
        if (normalizedText.includes(normalize(appellation))) {
          return { country, region, appellation }
        }
      }
    }
  }

  // Puis les régions seules
  for (const [country, regions] of Object.entries(regionsByCountry)) {
    for (const region of regions) {
      if (normalizedText.includes(normalize(region))) {
        return { country, region, appellation: '' }
      }
    }
  }

  return null
}

// Spec 17 & 18: Simulation de recherche discrète
export async function fetchWineData(query: string) {
  console.log("Recherche discrète pour:", query);
  // Ici le dev implémenterait le parsing via Proxy de Wine-Searcher
  return { name: "Château Margaux", vintage: 2015, region: "Bordeaux" };
}

// ─── Recherche dans wine_catalog ───────────────────────────────────────────
export interface WineSuggestion {
  winery: string
  country: string
  province: string
  region_1: string
  variety: string
}

export async function searchWineCatalog(
  query: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: any
): Promise<WineSuggestion[]> {
  const raw = query.trim()
  if (raw.length < 2) return []

  // Normaliser le query pour supprimer accents et tirets
  // Garder le query complet pour la recherche, même s'il contient des mots génériques
  const searchTerm = normalize(raw)
  if (searchTerm.length < 2) return []

  // Diviser la recherche en mots
  const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 0)

  // Construire une requête Supabase avec ILIKE pour chaque mot
  // Cela pré-filtre les résultats avant de les ramener au client
  let supabaseQuery = supabaseClient
    .from('wine_catalog')
    .select('winery, country, province, region_1, variety')
    .not('winery', 'is', null)

  // Ajouter une condition ILIKE pour le premier mot (pour pré-filtrer)
  if (searchWords.length > 0) {
    supabaseQuery = supabaseQuery.ilike('winery', `%${searchWords[0]}%`)
  }

  const { data, error } = await supabaseQuery.limit(100)

  if (error || !data) return []

  // Filtrer côté client : chercher les vins qui contiennent TOUS les mots du query
  const matches = data.filter((row: WineSuggestion) => {
    const normalizedWinery = normalize(row.winery)
    return searchWords.every(word => normalizedWinery.includes(word))
  })

  // Dédupliquer par winery et favoriser France
  const seen = new Set<string>()
  const france: WineSuggestion[] = []
  const others: WineSuggestion[] = []

  for (const row of matches) {
    const key = row.winery.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    if (row.country?.toLowerCase() === 'france') {
      france.push(row)
    } else {
      others.push(row)
    }
  }

  return [...france, ...others].slice(0, 3)
}
