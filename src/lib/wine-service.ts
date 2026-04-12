import imageCompression from 'browser-image-compression';


// ─── Interface pour résultat structuré ────────────────────────────────────
export interface RecognitionResult {
  text: string;
  rawText: string;
  domaine: string;
  cuvee: string;
  vintage: number | null;
  appellation: string;
  region: string;
  country: string;
}

// ─── Vérification et correction du vin via API route ────────────────────
async function verifyAndCorrectWineName(
  domaine: string,
  cuvee: string,
  appellation: string,
  country: string,
  supabaseClient?: any
): Promise<{ domaine: string; cuvee: string }> {
  console.log(`🔍 Vérification du domaine et cuvée...`);

  try {
    const response = await fetch('/api/verify-wine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domaine, cuvee, appellation, country }),
    });

    if (!response.ok) {
      console.warn('⚠️ Vérification échouée, garder les noms originaux');
      return { domaine, cuvee };
    }

    const data = await response.json();
    const correctedDomaine = data.correctedDomaine || domaine;
    const correctedCuvee = data.correctedCuvee || cuvee;

    if (correctedDomaine !== domaine) {
      console.log(`✅ Domaine corrigé: ${correctedDomaine}`);
    }
    if (correctedCuvee !== cuvee) {
      console.log(`✅ Cuvée corrigée: ${correctedCuvee}`);
    }

    // Insérer dans wine_catalog si confirmé et non-existant
    if (correctedDomaine !== 'INEXISTANT' && supabaseClient) {
      console.log(`💾 Vérification si déjà dans wine_catalog: ${correctedDomaine}`);

      try {
        // Vérifier si le vin existe déjà
        const { data: existing } = await supabaseClient
          .from('wine_catalog')
          .select('winery')
          .ilike('winery', `%${correctedDomaine}%`)
          .limit(1);

        if (!existing || existing.length === 0) {
          console.log(`➕ Vin absent, insertion dans wine_catalog: ${correctedDomaine}`);
          await supabaseClient.from('wine_catalog').insert({
            winery: correctedDomaine,
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

    return { domaine: correctedDomaine, cuvee: correctedCuvee };
  } catch (error) {
    console.warn('⚠️ Erreur vérification, garder les noms originaux:', error);
    return { domaine, cuvee };
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
  console.log('🔍 Lignes à parser:', lines);
  for (const line of lines) {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim().toLowerCase();
      const value = parts.slice(1).join(':').trim(); // Rejoindre au cas où il y a des ':' dans la valeur
      if (key && value) {
        parsed[key] = value;
        console.log(`  ✓ ${key}: ${value}`);
      }
    }
  }

  console.log('🔍 Parsed object:', parsed);
  let domaine = parsed.domaine || '';
  let cuvee = parsed.cuvee || domaine; // Si pas de cuvée, utiliser le domaine
  const vintage = parsed.vintage ? parseInt(parsed.vintage) : null;
  const appellation = parsed.appellation || '';
  const region = parsed.region || '';
  const country = parsed.pays || '';

  console.log('📋 Données extraites:');
  console.log(`  🏰 Domaine: ${domaine}`);
  console.log(`  🍾 Cuvée: ${cuvee}`);
  console.log(`  📅 Millésime: ${vintage}`);
  console.log(`  🍷 Appellation: ${appellation}`);
  console.log(`  📍 Région: ${region}`);
  console.log(`  🌍 Pays: ${country}`);

  // Exporter la fonction pour utilisation en fallback
  return {
    text: `${domaine}\n${cuvee}\n${appellation}\n${region}\n${vintage || ''}\n${country}`,
    rawText, // Garder le texte brut original pour détection classement
    domaine,
    cuvee,
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
    cuvee: recognition.cuvee,
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

// ─── Données de référence: Régions et Appellations ──────────────────────────
export const REGIONS_BY_COUNTRY: Record<string, string[]> = {
  'France': [
    'Bordeaux', 'Bourgogne', 'Champagne', 'Alsace', 'Rhône',
    'Loire', 'Languedoc-Roussillon', 'Provence', 'Beaujolais',
    'Jura', 'Savoie', 'Sud-Ouest', 'Corse', 'Normandie', 'Bretagne',
  ],
  'Italie': [
    'Toscane', 'Piémont', 'Vénétie', 'Sicile', 'Campanie',
    'Pouilles', 'Frioul-Vénétie Julienne', 'Lombardie', 'Marches',
    'Sardaigne', 'Ombrie', 'Émilie-Romagne', 'Calabre', 'Ligurie',
  ],
  'Espagne': [
    'Rioja', 'Ribera del Duero', 'Priorat', 'Penedès', 'Galice',
    'Jerez', 'Castille-La Manche', 'Navarre', 'Valence',
    'Aragon', 'Andalousie', 'Catalogne',
  ],
  'États-Unis': [
    'Napa Valley', 'Sonoma', 'Oregon', 'Washington State',
    'Finger Lakes', 'Willamette Valley', 'Santa Barbara', 'Paso Robles',
    'Central Coast', 'Sierra Foothills',
  ],
  'Argentine': ['Mendoza', 'Salta', 'San Juan', 'Patagonie', 'Río Negro', 'Luján de Cuyo', 'Valle de Uco', 'La Rioja'],
  'Australie': ['Barossa Valley', 'Coonawarra', 'Margaret River', 'Clare Valley', 'Yarra Valley', 'McLaren Vale', 'Hunter Valley', 'Eden Valley', 'Mornington Peninsula', 'Rutherglen'],
  'Chili': ['Maipo', 'Colchagua', 'Casablanca', 'Elqui', 'Bío-Bío', 'Aconcagua', 'Rapel', 'Curicó', 'Limarí', 'San Antonio'],
  'Allemagne': ['Mosel', 'Rheingau', 'Rheinhessen', 'Pfalz', 'Baden', 'Franken', 'Nahe', 'Württemberg', 'Mittelrhein', 'Ahr'],
  'Portugal': ['Douro', 'Vinho Verde', 'Alentejo', 'Dão', 'Lisboa', 'Setúbal', 'Algarve', 'Ribatejo', 'Bairrada', 'Madère'],
  'Afrique du Sud': ['Stellenbosch', 'Paarl', 'Swartland', 'Constantia', 'Franschhoek', 'Robertson', 'Walker Bay', 'Elgin'],
  'Nouvelle-Zélande': ['Marlborough', 'Central Otago', "Hawke's Bay", 'Martinborough', 'Gisborne', 'Nelson', 'Canterbury'],
  'Autriche': ['Wachau', 'Kremstal', 'Kamptal', 'Burgenland', 'Styrie', 'Vienne', 'Carnuntum', 'Weinviertel'],
  'Grèce': ['Santorin', 'Naoussa', 'Némée', 'Céphalonie', 'Crète', 'Macédoine', 'Péloponnèse', 'Égée'],
  'Hongrie': ['Tokaj', 'Eger', 'Villány', 'Badacsony', 'Sopron', 'Szekszárd'],
  'Roumanie': ['Dealu Mare', 'Cotnari', 'Murfatlar', 'Tîrnave', 'Dobrogea'],
  'Géorgie': ['Kakhétie', 'Kartlie', 'Iméréthie', 'Racha-Letchkhoumi'],
  'Liban': ['Bekaa', 'Batroun', 'Jezzine'],
  'Israël': ['Galilée', 'Shomron', 'Judée', 'Néguev'],
  'Maroc': ['Meknès', 'Benslimane', 'Berkane', 'Boulaouane'],
  'Tunisie': ['Bizerte', 'Mornag', 'Grombalia', 'Cap Bon'],
  'Suisse': ['Valais', 'Vaud', 'Genève', 'Neuchâtel', 'Tessin'],
  'Bulgarie': ['Thrace', 'Danube', 'Rose Valley', 'Stara Planina'],
  'Croatie': ['Istrie', 'Dalmatie', 'Slavonie', 'Zagreb'],
}

export const APPELLATIONS_BY_REGION: Record<string, string[]> = {
  'Bordeaux': ['Pauillac', 'Saint-Estèphe', 'Saint-Julien', 'Margaux', 'Pessac-Léognan', 'Pomerol', 'Saint-Émilion', 'Sauternes', 'Entre-Deux-Mers', 'Médoc', 'Haut-Médoc', 'Fronsac', 'Canon-Fronsac', 'Côtes de Bourg', 'Blaye', 'Graves', 'Barsac', 'Listrac-Médoc', 'Moulis-en-Médoc', 'Lalande-de-Pomerol', 'Bordeaux Supérieur', 'Bordeaux'],
  'Bourgogne': ['Chablis', 'Chambolle-Musigny', 'Gevrey-Chambertin', 'Pommard', 'Meursault', 'Puligny-Montrachet', 'Chassagne-Montrachet', 'Nuits-Saint-Georges', 'Vosne-Romanée', 'Beaune', 'Volnay', 'Morey-Saint-Denis', 'Vougeot', 'Echezeaux', 'Grands Echezeaux', 'Richebourg', 'Romanée-Conti', 'La Romanée', 'La Tâche', 'Santenay', 'Aloxe-Corton', 'Savigny-lès-Beaune', 'Auxey-Duresses', 'Marsannay', 'Saint-Aubin', 'Mercurey', 'Givry', 'Montagny', 'Rully', 'Maranges', 'Ladoix', 'Pernand-Vergelesses', 'Chorey-lès-Beaune', 'Bourgogne', 'Bourgogne Aligoté', 'Bourgogne Passetoutgrains', 'Bourgogne Gamay', 'Bourgogne Blanc', 'Bourgogne Rouge', 'Crémant de Bourgogne'],
  'Champagne': ['Champagne', 'Côteaux Champenois', 'Rosé des Riceys'],
  'Alsace': ['Alsace', 'Alsace Grand Cru', "Crémant d'Alsace"],
  'Rhône': ['Châteauneuf-du-Pape', 'Hermitage', 'Crozes-Hermitage', 'Côte-Rôtie', 'Saint-Joseph', 'Condrieu', 'Gigondas', 'Vacqueyras', 'Cornas', 'Tavel', 'Lirac', 'Rasteau', 'Cairanne', 'Ventoux', 'Luberon', 'Côtes du Rhône', 'Côtes du Rhône Villages', 'Muscat de Beaumes-de-Venise', 'Saint-Péray'],
  'Loire': ['Muscadet', 'Sancerre', 'Pouilly-Fumé', 'Vouvray', 'Bourgueil', 'Chinon', 'Anjou', 'Savennières', 'Quarts-de-Chaume', 'Bonnezeaux', 'Touraine', 'Montlouis', 'Saint-Nicolas-de-Bourgueil', 'Coteaux du Layon', 'Crémant de Loire', 'Muscadet Sèvre-et-Maine', 'Pouilly-sur-Loire', 'Reuilly', 'Quincy', 'Menetou-Salon'],
  'Languedoc-Roussillon': ['Languedoc', 'Minervois', 'Corbières', 'Fitou', 'Saint-Chinian', 'Faugères', 'Pic Saint-Loup', 'Costières de Nîmes', 'Banyuls', 'Maury', 'Rivesaltes', 'Côtes du Roussillon', 'Collioure', 'Limoux', 'Terrasses du Larzac', 'Pézenas'],
  'Provence': ['Bandol', 'Côtes de Provence', 'Cassis', 'Palette', 'Les Baux-de-Provence', "Coteaux d'Aix-en-Provence", 'Coteaux Varois en Provence', 'Bellet', 'Pierrevert'],
  'Beaujolais': ['Moulin-à-Vent', 'Morgon', 'Fleurie', 'Brouilly', 'Juliénas', 'Chiroubles', 'Côte de Brouilly', 'Chénas', 'Saint-Amour', 'Régnié', 'Beaujolais Villages', 'Beaujolais'],
  'Sud-Ouest': ['Cahors', 'Madiran', 'Bergerac', 'Monbazillac', 'Jurançon', 'Irouléguy', 'Fronton', 'Gaillac', 'Côtes de Duras', 'Pécharmant', 'Montravel', 'Buzet', 'Côtes du Marmandais'],
  'Jura': ['Arbois', 'Château-Chalon', "L'Étoile", 'Crémant du Jura', 'Côtes du Jura', 'Macvin du Jura'],
  'Savoie': ['Vin de Savoie', 'Roussette de Savoie', 'Crépy', 'Seyssel'],
  'Corse': ['Patrimonio', 'Ajaccio', 'Muscat du Cap Corse', 'Vin de Corse'],
  'Normandie': ['Cidre'],
  'Bretagne': ['Cidre'],
  'Toscane': ['Chianti', 'Chianti Classico', 'Brunello di Montalcino', 'Vino Nobile di Montepulciano', 'Bolgheri', 'Morellino di Scansano', 'Vernaccia di San Gimignano', 'Rosso di Montalcino', 'Rosso di Montepulciano', 'Maremma Toscana', 'Orcia'],
  'Piémont': ['Barolo', 'Barbaresco', "Barbera d'Asti", "Barbera d'Alba", "Dolcetto d'Alba", "Moscato d'Asti", 'Gavi', 'Asti', 'Langhe', 'Monferrato', 'Roero', "Brachetto d'Acqui"],
  'Vénétie': ['Amarone della Valpolicella', 'Valpolicella', 'Soave', 'Prosecco', 'Bardolino', 'Recioto della Valpolicella', 'Lugana', 'Ripasso'],
  'Sicile': ["Nero d'Avola", 'Marsala', 'Moscato di Pantelleria', 'Etna', 'Cerasuolo di Vittoria'],
  'Campanie': ['Taurasi', 'Greco di Tufo', 'Fiano di Avellino', 'Vesuvio'],
  'Pouilles': ['Primitivo di Manduria', 'Negroamaro', 'Salice Salentino', 'Brindisi', 'Lecce', 'Barolo del Salento'],
  'Frioul-Vénétie Julienne': ['Friuli DOC', 'Carso DOC', 'Collio DOC', 'Friuli Grave DOC', 'Friuli Isonzo DOC'],
  'Lombardie': ['Franciacorta DOCG', 'Valtellina Superiore DOCG', 'Oltrepò Pavese DOC', 'Lugana DOC', 'Sforzato'],
  'Marches': ["Montepulciano d'Abruzzo", 'Verdicchio', 'Rosso Conero'],
  'Sardaigne': ['Vermentino di Sardegna DOC', 'Cannonau di Sardegna DOC', 'Carignano del Sulcis DOC', 'Vernaccia di Oristano DOC'],
  'Ombrie': ['Sagrantino di Montefalco DOCG', 'Grechetto', 'Montefalco Rosso DOC', 'Torgiano DOC'],
  'Émilie-Romagne': ['Lambrusco DOC', 'Pignoletto DOC', 'Sangiovese di Romagna DOC', 'Trebbiano di Romagna DOC'],
  'Calabre': ['Cirò DOC', 'Greco di Gerace DOC', 'Melissa DOC'],
  'Ligurie': ['Pigato DOC', 'Vermentino DOC', 'Rossese di Dolceacqua DOC'],
  'Rioja': ['Rioja DOCa', 'Rioja Alavesa', 'Rioja Alta', 'Rioja Oriental'],
  'Ribera del Duero': ['Ribera del Duero DO'],
  'Priorat': ['Priorat DOQ', 'Montsant DO'],
  'Jerez': ['Fino', 'Manzanilla', 'Amontillado', 'Oloroso', 'Pedro Ximénez', 'Palo Cortado', 'Cream Sherry'],
  'Galice': ['Rías Baixas', 'Ribeiro', 'Valdeorras', 'Monterrei'],
  'Penedès': ['Penedès DO', 'Cava DO'],
  'Catalogne': ['Conca de Barberà DO', 'Costers del Segre DO', 'Tarragona DO'],
  'Castille-La Manche': ['La Mancha DO', 'Valdepeñas DO', 'Almansa DO'],
  'Valence': ['Utiel-Requena DO', 'Jumilla DO'],
  'Navarre': ['Navarra DOCa', 'Navarra Blanca'],
  'Aragon': ['Campo de Borja DO', 'Calatayud DO', 'Somontano DO', 'Teruel DO'],
  'Andalousie': ['Montilla-Moriles DO', 'Córdoba DO', 'Huelva DO'],
  'Napa Valley': ['Napa Valley AVA', 'Rutherford', 'Oakville', 'Stags Leap District', 'Mount Veeder', 'Howell Mountain', 'Spring Mountain District', 'Diamond Mountain District', 'Yountville', 'St. Helena'],
  'Sonoma': ['Russian River Valley', 'Sonoma Coast', 'Alexander Valley', 'Dry Creek Valley', 'Carneros', 'Chalk Hill'],
  'Oregon': ['Willamette Valley', 'Rogue Valley', 'Umpqua Valley'],
  'Finger Lakes': ['Seneca Lake AVA', 'Keuka Lake AVA', 'Cayuga Lake AVA'],
  'Washington State': ['Columbia Valley AVA', 'Walla Walla Valley AVA', 'Yakima Valley AVA', 'Puget Sound AVA'],
  'Santa Barbara': ['Santa Maria Valley AVA', 'Santa Ynez Valley AVA'],
  'Paso Robles': ['Paso Robles AVA', 'Adelaida District'],
  'Central Coast': ['Monterey AVA', 'San Luis Obispo AVA', 'Santa Cruz Mountains AVA'],
  'Sierra Foothills': ['Amador County AVA', 'El Dorado AVA', 'Tuolumne County AVA'],
  'Willamette Valley': ['Willamette Valley AVA', 'Dundee Hills AVA', 'Yamhill-Carlton AVA'],
  'Mendoza': ['Luján de Cuyo', 'Valle de Uco', 'Maipú', 'Tupungato'],
  'Douro': ['Porto', 'Douro DOC', 'Porto Vintage', 'Porto LBV'],
  'Vinho Verde': ['Vinho Verde DOC', 'Alvarinho', 'Loureiro', 'Azal'],
  'Alentejo': ['Alentejo DOC', 'Vidigueira', 'Borba', 'Redondo', 'Reguengos'],
  'Barossa Valley': ['Barossa Valley GI', 'Eden Valley GI'],
  'Margaret River': ['Margaret River GI'],
  'Mosel': ['Bernkasteler Doctor', 'Piesporter Goldtröpfchen', 'Wehlener Sonnenuhr', 'Scharzhofberg', 'Trittenheimer Apotheke'],
  'Rheingau': ['Rüdesheimer Berg Schlossberg', 'Johannisberger Vogelsang', 'Hattenheimer Nussbrunnen', 'Rheingau QbA'],
  'Rheinhessen': ['Rheinhessen QbA', 'Nierstein'],
  'Pfalz': ['Pfalz QbA', 'Bad Dürkheim'],
  'Baden': ['Baden QbA', 'Kaiserstuhl'],
  'Franken': ['Franken QbA', 'Würzburg'],
  'Nahe': ['Nahe QbA', 'Bad Kreuznach'],
  'Württemberg': ['Württemberg QbA', 'Stuttgart'],
  'Mittelrhein': ['Mittelrhein QbA', 'Assmannshausen'],
  'Ahr': ['Ahr QbA', 'Spätburgunder', 'Ahrweiler'],
  'Tokaj': ['Tokaji Aszú', 'Tokaji Furmint', 'Tokaji Szamorodni'],
  'Wachau': ['Wachau DAC', 'Grüner Veltliner', 'Riesling Wachau'],
  'Santorin': ['Santorin AOC', 'Assyrtiko de Santorin'],
  'Naoussa': ['Naoussa AOC', 'Xinomavro'],
  'Némée': ['Nemea AOC', 'Agiorgitiko'],
  'Céphalonie': ['Robola de Cephalonie AOC'],
  'Crète': ['Crète AOC', 'Malvasia', 'Kotsifali'],
  'Macédoine': ['Carmenere', 'Rapsani AOC'],
  'Péloponnèse': ['Corinthia AOC', 'Mantinia AOC'],
  'Égée': ['Cyclades AOC', 'Rhodes AOC'],
  'Kremstal': ['Kremstal DAC', 'Grüner Veltliner Kremstal', 'Riesling Kremstal'],
  'Kamptal': ['Kamptal DAC', 'Grüner Veltliner Kamptal', 'Riesling Kamptal'],
  'Burgenland': ['Neusiedlersee DAC', 'Neusiedlersee-Hügelland DAC', 'Mittelburgenland DAC', 'Blaufränkisch Burgenland'],
  'Styrie': ['Styria QbA', 'Grüner Veltliner Styrie', 'Sauvignon Blanc Styrie'],
  'Vienne': ['Vienne QbA', 'Grüner Veltliner Vienne', 'Wiener Neustadt'],
  'Carnuntum': ['Carnuntum DAC', 'Blaufränkisch Carnuntum'],
  'Weinviertel': ['Weinviertel DAC', 'Grüner Veltliner Weinviertel'],
  'Stellenbosch': ['Stellenbosch WO', 'Cabernet Sauvignon Stellenbosch', 'Shiraz Stellenbosch', 'Pinotage Stellenbosch'],
  'Paarl': ['Paarl WO', 'Cabernet Sauvignon Paarl', 'Pinotage Paarl', 'Chenin Blanc Paarl'],
  'Swartland': ['Swartland WO', 'Shiraz Swartland', 'Carignan Swartland', 'Chenin Blanc Swartland'],
  'Constantia': ['Constantia WO', 'Sauvignon Blanc Constantia', 'Shiraz Constantia', 'Muscat Constantia'],
  'Franschhoek': ['Franschhoek WO', 'Cabernet Sauvignon Franschhoek', 'Shiraz Franschhoek', 'Chenin Blanc Franschhoek'],
  'Robertson': ['Robertson WO', 'Shiraz Robertson', 'Chenin Blanc Robertson', 'Chardonnay Robertson'],
  'Walker Bay': ['Walker Bay WO', 'Pinot Noir Walker Bay', 'Sauvignon Blanc Walker Bay', 'Chardonnay Walker Bay'],
  'Elgin': ['Elgin WO', 'Sauvignon Blanc Elgin', 'Pinot Noir Elgin', 'Chardonnay Elgin'],
}

// ─── Matching fuzzy avec tolérance élevée ──────────────────────────────────
/**
 * Calcule la similarité entre deux strings (0 à 1)
 * Utilisé pour le fuzzy matching avec tolérance élevée
 */
function calculateSimilarity(a: string, b: string): number {
  const normalA = normalize(a)
  const normalB = normalize(b)

  if (normalA === normalB) return 1.0
  if (normalA.length === 0 || normalB.length === 0) return 0

  // Levenshtein distance simplifiée : ratio des caractères qui matchent
  const maxLen = Math.max(normalA.length, normalB.length)
  let matches = 0

  for (let i = 0; i < Math.min(normalA.length, normalB.length); i++) {
    if (normalA[i] === normalB[i]) matches++
  }

  // Si un string contient l'autre, c'est un très bon match
  if (normalA.includes(normalB) || normalB.includes(normalA)) {
    return 0.85
  }

  return matches / maxLen
}

/**
 * Trouve la région qui correspond le mieux à la chaîne donnée
 * Tolérance élevée: seuil 0.65
 */
export function matchRegionToList(detectedRegion: string, country: string): string {
  if (!detectedRegion || detectedRegion.trim().length === 0) return detectedRegion

  const regions = REGIONS_BY_COUNTRY[country] || []
  let bestMatch = detectedRegion
  let bestScore = 0

  for (const region of regions) {
    const score = calculateSimilarity(detectedRegion, region)
    if (score > bestScore) {
      bestScore = score
      bestMatch = region
    }
  }

  // Retourner le match seulement si le score est acceptable (65%+)
  return bestScore >= 0.65 ? bestMatch : detectedRegion
}

/**
 * Trouve l'appellation qui correspond le mieux à la chaîne donnée
 * Tolérance élevée: seuil 0.65
 */
export function matchAppellationToList(detectedAppellation: string, region: string): string {
  if (!detectedAppellation || detectedAppellation.trim().length === 0) return detectedAppellation

  const appellations = APPELLATIONS_BY_REGION[region] || []
  let bestMatch = detectedAppellation
  let bestScore = 0

  for (const appellation of appellations) {
    const score = calculateSimilarity(detectedAppellation, appellation)
    if (score > bestScore) {
      bestScore = score
      bestMatch = appellation
    }
  }

  // Retourner le match seulement si le score est acceptable (65%+)
  return bestScore >= 0.65 ? bestMatch : detectedAppellation
}
