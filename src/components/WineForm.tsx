"use client"
import { useState, useRef, useEffect } from 'react'
import { X, Save, Wine as WineIcon, Star, Camera, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import imageCompression from 'browser-image-compression'
import { processBottleImage, extractDomainFromOCR, extractAppellationFromOCR, extractVintageFromOCR, searchWineCatalog, WineSuggestion, normalize, verifyAndCorrectWineName, detectClassement1859 } from '@/lib/wine-service'
import { capitalize } from '@/lib/format'
import { fetchUserSettings } from '@/lib/settings-service'
import ImageCropModal from './ImageCropModal'

// ============================================================
// DONNÉES GÉOGRAPHIQUES
// ============================================================

const TOP_WINE_COUNTRIES = [
  'France', 'Italie', 'Espagne', 'États-Unis', 'Argentine',
  'Australie', 'Chili', 'Allemagne', 'Portugal', 'Afrique du Sud',
  'Nouvelle-Zélande', 'Autriche', 'Grèce', 'Hongrie', 'Roumanie',
]

const OTHER_COUNTRIES = [
  'Albanie', 'Algérie', 'Andorre', 'Angola', 'Arménie',
  'Azerbaïdjan', 'Belgique', 'Bolivie', 'Bosnie-Herzégovine', 'Brésil',
  'Bulgarie', 'Canada', 'Chine', 'Chypre', 'Colombie',
  'Croatie', 'Équateur', 'Géorgie', 'Inde', 'Israël',
  'Japon', 'Jordanie', 'Kazakhstan', 'Kosovo', 'Liban',
  'Luxembourg', 'Macédoine du Nord', 'Malte', 'Maroc', 'Mexique',
  'Moldavie', 'Monténégro', 'Namibie', 'Pays-Bas', 'Pérou',
  'République tchèque', 'Russie', 'Serbie', 'Slovaquie', 'Slovénie',
  'Suisse', 'Syrie', 'Tadjikistan', 'Tunisie', 'Turquie',
  'Ukraine', 'Uruguay', 'Ouzbékistan', 'Zimbabwe',
]

const ALL_COUNTRIES = [...TOP_WINE_COUNTRIES, ...OTHER_COUNTRIES]

const REGIONS_BY_COUNTRY: Record<string, string[]> = {
  'France': [
    'Bordeaux', 'Bourgogne', 'Champagne', 'Alsace', 'Rhône',
    'Loire', 'Languedoc-Roussillon', 'Provence', 'Beaujolais',
    'Jura', 'Savoie', 'Sud-Ouest', 'Corse',
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
  'Argentine': [
    'Mendoza', 'Salta', 'San Juan', 'Patagonie', 'Río Negro',
    'Luján de Cuyo', 'Valle de Uco', 'La Rioja',
  ],
  'Australie': [
    'Barossa Valley', 'Coonawarra', 'Margaret River', 'Clare Valley',
    'Yarra Valley', 'McLaren Vale', 'Hunter Valley', 'Eden Valley',
    'Mornington Peninsula', 'Rutherglen',
  ],
  'Chili': [
    'Maipo', 'Colchagua', 'Casablanca', 'Elqui', 'Bío-Bío',
    'Aconcagua', 'Rapel', 'Curicó', 'Limarí', 'San Antonio',
  ],
  'Allemagne': [
    'Mosel', 'Rheingau', 'Rheinhessen', 'Pfalz', 'Baden',
    'Franken', 'Nahe', 'Württemberg', 'Mittelrhein', 'Ahr',
  ],
  'Portugal': [
    'Douro', 'Vinho Verde', 'Alentejo', 'Dão', 'Lisboa',
    'Setúbal', 'Algarve', 'Ribatejo', 'Bairrada', 'Madère',
  ],
  'Afrique du Sud': [
    'Stellenbosch', 'Paarl', 'Swartland', 'Constantia',
    'Franschhoek', 'Robertson', 'Walker Bay', 'Elgin',
  ],
  'Nouvelle-Zélande': [
    'Marlborough', 'Central Otago', "Hawke's Bay",
    'Martinborough', 'Gisborne', 'Nelson', 'Canterbury',
  ],
  'Autriche': [
    'Wachau', 'Kremstal', 'Kamptal', 'Burgenland',
    'Styrie', 'Vienne', 'Carnuntum', 'Weinviertel',
  ],
  'Grèce': [
    'Santorin', 'Naoussa', 'Némée', 'Céphalonie',
    'Crète', 'Macédoine', 'Péloponnèse', 'Égée',
  ],
  'Hongrie': [
    'Tokaj', 'Eger', 'Villány', 'Badacsony', 'Sopron', 'Szekszárd',
  ],
  'Roumanie': [
    'Dealu Mare', 'Cotnari', 'Murfatlar', 'Tîrnave', 'Dobrogea',
  ],
  'Géorgie': [
    'Kakhétie', 'Kartlie', 'Iméréthie', 'Racha-Letchkhoumi',
  ],
  'Liban': [
    'Bekaa', 'Batroun', 'Jezzine',
  ],
  'Israël': [
    'Galilée', 'Shomron', 'Judée', 'Néguev',
  ],
  'Maroc': [
    'Meknès', 'Benslimane', 'Berkane', 'Boulaouane',
  ],
  'Tunisie': [
    'Bizerte', 'Mornag', 'Grombalia', 'Cap Bon',
  ],
  'Suisse': [
    'Valais', 'Vaud', 'Genève', 'Neuchâtel', 'Tessin',
  ],
  'Bulgarie': [
    'Thrace', 'Danube', 'Rose Valley', 'Stara Planina',
  ],
  'Croatie': [
    'Istrie', 'Dalmatie', 'Slavonie', 'Zagreb',
  ],
}

const APPELLATIONS_BY_REGION: Record<string, string[]> = {
  // France – Bordeaux
  'Bordeaux': [
    'Pauillac', 'Saint-Estèphe', 'Saint-Julien', 'Margaux',
    'Pessac-Léognan', 'Pomerol', 'Saint-Émilion', 'Sauternes',
    'Entre-Deux-Mers', 'Médoc', 'Haut-Médoc', 'Fronsac',
    'Canon-Fronsac', 'Côtes de Bourg', 'Blaye', 'Graves',
    'Barsac', 'Listrac-Médoc', 'Moulis-en-Médoc',
    'Lalande-de-Pomerol', 'Bordeaux Supérieur', 'Bordeaux',
  ],
  // France – Bourgogne
  'Bourgogne': [
    // Grand Crus
    'Chablis', 'Chambolle-Musigny', 'Gevrey-Chambertin', 'Pommard',
    'Meursault', 'Puligny-Montrachet', 'Chassagne-Montrachet',
    'Nuits-Saint-Georges', 'Vosne-Romanée', 'Beaune', 'Volnay',
    'Morey-Saint-Denis', 'Vougeot', 'Echezeaux', 'Grands Echezeaux',
    'Richebourg', 'Romanée-Conti', 'La Romanée', 'La Tâche',
    // Premiers Crus et Régionaux
    'Santenay', 'Aloxe-Corton', 'Savigny-lès-Beaune',
    'Auxey-Duresses', 'Marsannay', 'Saint-Aubin', 'Mercurey',
    'Givry', 'Montagny', 'Rully', 'Maranges', 'Ladoix',
    'Pernand-Vergelesses', 'Chorey-lès-Beaune',
    // Régionaux
    'Bourgogne', 'Bourgogne Aligoté', 'Bourgogne Passetoutgrains',
    'Bourgogne Gamay', 'Bourgogne Blanc', 'Bourgogne Rouge',
    'Crémant de Bourgogne',
  ],
  // France – Champagne
  'Champagne': [
    'Champagne', 'Côteaux Champenois', 'Rosé des Riceys',
  ],
  // France – Alsace
  'Alsace': [
    'Alsace', 'Alsace Grand Cru', "Crémant d'Alsace",
  ],
  // France – Rhône
  'Rhône': [
    'Châteauneuf-du-Pape', 'Hermitage', 'Crozes-Hermitage',
    'Côte-Rôtie', 'Saint-Joseph', 'Condrieu', 'Gigondas',
    'Vacqueyras', 'Cornas', 'Tavel', 'Lirac', 'Rasteau',
    'Cairanne', 'Ventoux', 'Luberon', 'Côtes du Rhône',
    'Côtes du Rhône Villages', 'Muscat de Beaumes-de-Venise',
    'Saint-Péray',
  ],
  // France – Loire
  'Loire': [
    'Muscadet', 'Sancerre', 'Pouilly-Fumé', 'Vouvray',
    'Bourgueil', 'Chinon', 'Anjou', 'Savennières',
    'Quarts-de-Chaume', 'Bonnezeaux', 'Touraine', 'Montlouis',
    'Saint-Nicolas-de-Bourgueil', 'Coteaux du Layon',
    'Crémant de Loire', 'Muscadet Sèvre-et-Maine',
    'Pouilly-sur-Loire', 'Reuilly', 'Quincy', 'Menetou-Salon',
  ],
  // France – Languedoc-Roussillon
  'Languedoc-Roussillon': [
    'Languedoc', 'Minervois', 'Corbières', 'Fitou',
    'Saint-Chinian', 'Faugères', 'Pic Saint-Loup',
    'Costières de Nîmes', 'Banyuls', 'Maury', 'Rivesaltes',
    'Côtes du Roussillon', 'Collioure', 'Limoux',
    'Terrasses du Larzac', 'Pézenas',
  ],
  // France – Provence
  'Provence': [
    'Bandol', 'Côtes de Provence', 'Cassis', 'Palette',
    'Les Baux-de-Provence', "Coteaux d'Aix-en-Provence",
    'Coteaux Varois en Provence', 'Bellet', 'Pierrevert',
  ],
  // France – Beaujolais
  'Beaujolais': [
    'Moulin-à-Vent', 'Morgon', 'Fleurie', 'Brouilly',
    'Juliénas', 'Chiroubles', 'Côte de Brouilly', 'Chénas',
    'Saint-Amour', 'Régnié', 'Beaujolais Villages', 'Beaujolais',
  ],
  // France – Sud-Ouest
  'Sud-Ouest': [
    'Cahors', 'Madiran', 'Bergerac', 'Monbazillac', 'Jurançon',
    'Irouléguy', 'Fronton', 'Gaillac', 'Côtes de Duras',
    'Pécharmant', 'Montravel', 'Buzet', 'Côtes du Marmandais',
  ],
  // France – Jura
  'Jura': [
    'Arbois', 'Château-Chalon', "L'Étoile", 'Crémant du Jura',
    'Côtes du Jura', 'Macvin du Jura',
  ],
  // France – Savoie
  'Savoie': [
    'Vin de Savoie', 'Roussette de Savoie', 'Crépy', 'Seyssel',
  ],
  // France – Corse
  'Corse': [
    'Patrimonio', 'Ajaccio', 'Muscat du Cap Corse', 'Vin de Corse',
  ],
  // Italie – Toscane
  'Toscane': [
    'Chianti', 'Chianti Classico', 'Brunello di Montalcino',
    'Vino Nobile di Montepulciano', 'Bolgheri', 'Morellino di Scansano',
    'Vernaccia di San Gimignano', 'Rosso di Montalcino',
    'Rosso di Montepulciano', 'Maremma Toscana', 'Orcia',
  ],
  // Italie – Piémont
  'Piémont': [
    'Barolo', 'Barbaresco', "Barbera d'Asti", "Barbera d'Alba",
    "Dolcetto d'Alba", "Moscato d'Asti", 'Gavi', 'Asti',
    'Langhe', 'Monferrato', 'Roero', "Brachetto d'Acqui",
  ],
  // Italie – Vénétie
  'Vénétie': [
    'Amarone della Valpolicella', 'Valpolicella', 'Soave',
    'Prosecco', 'Bardolino', 'Recioto della Valpolicella',
    'Lugana', 'Ripasso',
  ],
  // Italie – Sicile
  'Sicile': [
    "Nero d'Avola", 'Marsala', 'Moscato di Pantelleria',
    'Etna', 'Cerasuolo di Vittoria',
  ],
  // Italie – Campanie
  'Campanie': [
    'Taurasi', 'Greco di Tufo', 'Fiano di Avellino', 'Vesuvio',
  ],
  // Espagne – Rioja
  'Rioja': [
    'Rioja DOCa', 'Rioja Alavesa', 'Rioja Alta', 'Rioja Oriental',
  ],
  // Espagne – Ribera del Duero
  'Ribera del Duero': ['Ribera del Duero DO'],
  // Espagne – Priorat
  'Priorat': ['Priorat DOQ', 'Montsant DO'],
  // Espagne – Jerez
  'Jerez': [
    'Fino', 'Manzanilla', 'Amontillado', 'Oloroso',
    'Pedro Ximénez', 'Palo Cortado', 'Cream Sherry',
  ],
  // Espagne – Galice
  'Galice': ['Rías Baixas', 'Ribeiro', 'Valdeorras', 'Monterrei'],
  // Espagne – Penedès
  'Penedès': ['Penedès DO', 'Cava DO'],
  // États-Unis – Napa Valley
  'Napa Valley': [
    'Napa Valley AVA', 'Rutherford', 'Oakville', 'Stags Leap District',
    'Mount Veeder', 'Howell Mountain', 'Spring Mountain District',
    'Diamond Mountain District', 'Yountville', 'St. Helena',
  ],
  // États-Unis – Sonoma
  'Sonoma': [
    'Russian River Valley', 'Sonoma Coast', 'Alexander Valley',
    'Dry Creek Valley', 'Carneros', 'Chalk Hill',
  ],
  // États-Unis – Oregon
  'Oregon': [
    'Willamette Valley', 'Rogue Valley', 'Umpqua Valley',
  ],
  // Argentine – Mendoza
  'Mendoza': [
    'Luján de Cuyo', 'Valle de Uco', 'Maipú', 'Tupungato',
  ],
  // Portugal – Douro
  'Douro': [
    'Porto', 'Douro DOC', 'Porto Vintage', 'Porto LBV',
  ],
  // Portugal – Vinho Verde
  'Vinho Verde': [
    'Vinho Verde DOC', 'Alvarinho', 'Loureiro', 'Azal',
  ],
  // Portugal – Alentejo
  'Alentejo': [
    'Alentejo DOC', 'Vidigueira', 'Borba', 'Redondo', 'Reguengos',
  ],
  // Australie – Barossa Valley
  'Barossa Valley': ['Barossa Valley GI', 'Eden Valley GI'],
  // Australie – Margaret River
  'Margaret River': ['Margaret River GI'],
  // Allemagne – Mosel
  'Mosel': [
    'Bernkasteler Doctor', 'Piesporter Goldtröpfchen',
    'Wehlener Sonnenuhr', 'Scharzhofberg', 'Trittenheimer Apotheke',
  ],
  // Allemagne – Rheingau
  'Rheingau': [
    'Rüdesheimer Berg Schlossberg', 'Johannisberger Vogelsang',
    'Hattenheimer Nussbrunnen',
  ],
  // Hongrie – Tokaj
  'Tokaj': [
    'Tokaji Aszú', 'Tokaji Furmint', 'Tokaji Szamorodni',
  ],
  // Autriche – Wachau
  'Wachau': [
    'Wachau DAC', 'Grüner Veltliner', 'Riesling Wachau',
  ],
  // Grèce – Santorin
  'Santorin': ['Santorin AOC', 'Assyrtiko de Santorin'],
  // Grèce – Naoussa
  'Naoussa': ['Naoussa AOC', 'Xinomavro'],
}

// ============================================================
// COMPOSANT COMBOBOX
// ============================================================

function Combobox({
  label, value, onChange, suggestions, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Filtre : si la valeur est vide, on affiche toutes les suggestions telles quelles
  // Sinon on filtre par correspondance
  const filtered = value
    ? suggestions.filter(s => normalize(s).includes(normalize(value)))
    : suggestions

  // Afficher les suggestions seulement après 3 caractères
  const shouldShowSuggestions = value.length >= 3 && open && filtered.length > 0

  return (
    <div className="space-y-1 relative" ref={ref}>
      <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">{label}</label>
      <input
        className="w-full bg-transparent border-b border-stone-200 py-2 outline-none text-sm focus:border-bordeaux/50 transition-colors"
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => value.length >= 3 && setOpen(true)}
      />
      {shouldShowSuggestions && (
        <ul className="absolute z-[600] left-0 right-0 bg-white border border-stone-100 rounded-2xl shadow-2xl max-h-44 overflow-y-auto mt-1 top-full">
          {filtered.slice(0, 20).map(s => (
            <li
              key={s}
              onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false) }}
              className="px-4 py-2.5 text-sm cursor-pointer hover:bg-stone-50 active:bg-stone-100 first:rounded-t-2xl last:rounded-b-2xl"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ============================================================
// MAPPAGE DES DONNÉES WINE_CATALOG VERS L'APP
// ============================================================

// Traductions anglais → français pour les pays et régions
const COUNTRY_TRANSLATIONS: Record<string, string> = {
  'italy': 'Italie',
  'spain': 'Espagne',
  'germany': 'Allemagne',
  'usa': 'États-Unis',
  'united states': 'États-Unis',
  'argentina': 'Argentine',
  'chile': 'Chili',
  'australia': 'Australie',
  'new zealand': 'Nouvelle-Zélande',
  'austria': 'Autriche',
  'greece': 'Grèce',
  'hungary': 'Hongrie',
  'romania': 'Roumanie',
  'georgia': 'Géorgie',
  'lebanon': 'Liban',
  'israel': 'Israël',
  'morocco': 'Maroc',
  'tunisia': 'Tunisie',
  'switzerland': 'Suisse',
  'bulgaria': 'Bulgarie',
  'croatia': 'Croatie',
  'portugal': 'Portugal',
  'south africa': 'Afrique du Sud',
  'canada': 'Canada',
  'brazil': 'Brésil',
  'france': 'France',
}

const REGION_TRANSLATIONS: Record<string, string> = {
  // Italie
  'tuscany': 'Toscane',
  'piedmont': 'Piémont',
  'veneto': 'Vénétie',
  'sicily': 'Sicile',
  'campania': 'Campanie',
  'apulia': 'Pouilles',
  'lombardy': 'Lombardie',
  'sardinia': 'Sardaigne',
  'emilia-romagna': 'Émilie-Romagne',
  'calabria': 'Calabre',
  'liguria': 'Ligurie',
  'umbria': 'Ombrie',
  'marches': 'Marches',
  'friuli-venezia giulia': 'Frioul-Vénétie Julienne',

  // Grèce
  'achaia': 'Achaïe',
  'aegean': 'Égée',
  'arcadia': 'Arcadie',
  'attica': 'Attique',
  'beotia': 'Béotie',
  'amyndeon': 'Amyndeon',
  'agioritikos': 'Agioritikos',

  // Portugal
  'alentejo': 'Alentejo',
  'alentejano': 'Alentejo',
  'alenteo': 'Alentejo',
  'algarve': 'Algarve',
  'bairrada': 'Bairrada',
  'beira atlantico': 'Beira Atlântica',
  'beira interior': 'Beira Interior',
  'beiras': 'Beiras',
  'bucelas': 'Bucelas',
  'alenquer': 'Alenquer',

  // France
  'alsace': 'Alsace',
  'beaujolais': 'Beaujolais',
  'bordeaux': 'Bordeaux',
  'burgundy': 'Bourgogne',

  // Allemagne
  'ahr': 'Ahr',
  'baden': 'Baden',

  // Autriche
  'burgenland': 'Burgenland',
  'carnuntum': 'Carnuntum',

  // Chili
  'aconcagua costa': 'Aconcagua Costa',
  'aconcagua valley': 'Vallée d\'Aconcagua',
  'apalta': 'Apalta',
  'bío bío valley': 'Vallée du Bío Bío',
  'cachapoal valley': 'Vallée de Cachapoal',
  'casablanca valley': 'Vallée de Casablanca',
  'casablanca & leyda valleys': 'Vallées de Casablanca et Leyda',
  'casablanca-curicó valley': 'Vallée de Casablanca-Curicó',
  'cauquenes valley': 'Vallée de Cauquenes',

  // Espagne
  'catalonia': 'Catalogne',
  'andalucia': 'Andalousie',

  // Afrique du Sud
  'breede river valley': 'Vallée de la Breede River',
  'breedekloof': 'Breedekloof',
  'bot river': 'Bot River',
  'cape agulhas': 'Cap Agulhas',
  'cape peninsula': 'Péninsule du Cap',
  'cape south coast': 'Côte Sud du Cap',

  // Nouvelle-Zélande
  'awatere valley': 'Vallée d\'Awatere',
  'canterbury': 'Canterbury',

  // USA
  'arizona': 'Arizona',
  'california': 'Californie',

  // Liban
  'bekaa valley': 'Vallée de la Bekaa',

  // Turquie
  'cappadocia': 'Cappadoce',
  'ankara': 'Ankara',

  // Canada
  'british columbia': 'Colombie-Britannique',

  // Uruguay
  'canelones': 'Canelones',

  // Autres
  'brazil': 'Brésil',
  'campanha': 'Campanha',
  'brda': 'Brda',
  'cahul': 'Cahul',
  'atalanti valley': 'Vallée d\'Atalanti',
  'black sea coastal': 'Côte de la Mer Noire',
}

/**
 * Cherche le pays en français correspondant à la valeur de la BD
 * Utilise le nommage de l'app si trouvé, sinon retourne la valeur telle quelle
 */
function mapCountry(dbCountry: string | undefined | null): string {
  if (!dbCountry) return 'France'

  // Chercher une traduction directe anglais → français
  const key = dbCountry.toLowerCase().trim()
  if (COUNTRY_TRANSLATIONS[key]) {
    return capitalize(COUNTRY_TRANSLATIONS[key])
  }

  // Chercher une correspondance fuzzy dans ALL_COUNTRIES
  const normalized = normalize(dbCountry)
  const matched = ALL_COUNTRIES.find(c => normalize(c) === normalized)
  return capitalize(matched || dbCountry)
}

/**
 * Cherche la région en français correspondant au pays et à la valeur de la BD
 */
function mapRegion(country: string, dbRegion: string | undefined | null): string {
  if (!dbRegion) return ''

  // Chercher une traduction directe anglais → français
  const key = dbRegion.toLowerCase().trim()
  if (REGION_TRANSLATIONS[key]) {
    return capitalize(REGION_TRANSLATIONS[key])
  }

  // Chercher une correspondance fuzzy dans les régions du pays
  const regionList = REGIONS_BY_COUNTRY[country] || []
  const normalized = normalize(dbRegion)
  const matched = regionList.find(r => normalize(r) === normalized)
  return capitalize(matched || dbRegion)
}

/**
 * Cherche l'appellation en français correspondant à la région et à la valeur de la BD
 */
function mapAppellation(region: string, dbAppellation: string | undefined | null): string {
  if (!dbAppellation) return ''

  const appellationList = APPELLATIONS_BY_REGION[region] || []
  const normalized = normalize(dbAppellation)
  const matched = appellationList.find(a => normalize(a) === normalized)
  return capitalize(matched || dbAppellation)
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function WineForm({ x, y, onSave, onCancel, initialData }: any) {
  const [form, setForm] = useState({
    name: initialData?.name ?? '',
    vintage: initialData?.vintage ?? null,
    color: initialData?.color ?? 'red',
    country: initialData?.country ?? 'France',
    region: initialData?.region ?? '',
    appellation: initialData?.appellation ?? '',
    is_1859_classified: initialData?.is_1859_classified ?? false,
    style: initialData?.style ?? 'still',
    sweetness: initialData?.sweetness ?? 'dry',
    producer_url: initialData?.producer_url ?? '',
    grapes: initialData?.grapes ?? '',
    peak_date: initialData?.peak_date ?? new Date().getFullYear() + 10,
    image_url: initialData?.image_url ?? '',
    price: initialData?.price ?? 0,
    quantity: 1,
  })

  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.image_url ?? null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<WineSuggestion[]>([])
  const [showCropModal, setShowCropModal] = useState(false)
  const [pendingPhotoFile, setPendingPhotoFile] = useState<{ file: File; preview: string } | null>(null)
  const [enableCropping, setEnableCropping] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Charger les préférences utilisateur
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await fetchUserSettings()
      setEnableCropping(settings.enable_label_cropping)
    }
    loadSettings()
  }, [])

  // ---- Auto-complétion du champ "Domaine / Cuvée" ----
  useEffect(() => {
    if (ocrLoading) return
    const timer = setTimeout(async () => {
      if (form.name.length >= 3) {
        const hits = await searchWineCatalog(form.name, supabase)
        setSuggestions(hits)
        setShowSuggestions(hits.length > 0)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [form.name, ocrLoading])

  // ---- Suggestions dynamiques ----
  const countrySuggestions = form.country
    ? ALL_COUNTRIES.filter(c => normalize(c).includes(normalize(form.country)))
    : TOP_WINE_COUNTRIES

  const regionList = REGIONS_BY_COUNTRY[form.country] || []
  const regionSuggestions = form.region
    ? regionList.filter(r => normalize(r).includes(normalize(form.region)))
    : regionList

  const appellationList = APPELLATIONS_BY_REGION[form.region] || []
  const appellationSuggestions = form.appellation
    ? appellationList.filter(a => normalize(a).includes(normalize(form.appellation)))
    : appellationList

  // ---- Handlers avec reset des champs dépendants ----
  const handleCountryChange = (v: string) => {
    // On ne réinitialise région/appellation que si le nouveau pays est reconnu
    // (= sélectionné depuis la liste), pas à chaque frappe libre
    const isKnownCountry = REGIONS_BY_COUNTRY[v] !== undefined
    setForm(f => ({
      ...f,
      country: v,
      ...(isKnownCountry && v !== f.country ? { region: '', appellation: '' } : {}),
    }))
  }

  const handleRegionChange = (v: string) => {
    const isKnownRegion = APPELLATIONS_BY_REGION[v] !== undefined
    setForm(f => ({
      ...f,
      region: v,
      ...(isKnownRegion && v !== f.region ? { appellation: '' } : {}),
    }))
  }

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)

    if (enableCropping) {
      setPendingPhotoFile({ file, preview })
      setShowCropModal(true)
    } else {
      // Skip cropping, go directly to OCR
      setPhotoPreview(preview)
      setOcrLoading(true)
      try {
        const result = await processBottleImage(file)
        // ... rest of OCR logic (same as handleCropComplete)
        const { text, rawText, compressedFile, domaine, vintage, appellation, region, country } = result
        setPhotoFile(compressedFile)

        let finalDomaine = domaine
        if (domaine) {
          let hits = await searchWineCatalog(domaine, supabase)

          if (hits.length > 0) {
            setSuggestions(hits)
            setShowSuggestions(true)
          } else {
            finalDomaine = await verifyAndCorrectWineName(domaine, region, appellation, supabase) || domaine
            hits = await searchWineCatalog(finalDomaine, supabase)
            if (hits.length > 0) {
              setSuggestions(hits)
              setShowSuggestions(true)
            }
          }
        }

        const hasClassement = detectClassement1859(rawText, region, appellation)

        setForm(f => ({
          ...f,
          name: finalDomaine || f.name,
          vintage: vintage || f.vintage,
          appellation: appellation || f.appellation,
          region: region || f.region,
          country: country || f.country,
          is_1859_classified: hasClassement,
        }))
      } catch (error) {
        console.error('Erreur OCR:', error)
      } finally {
        setOcrLoading(false)
      }
    }
  }

  const handleCropComplete = async (croppedFile: File) => {
    setShowCropModal(false)
    const preview = URL.createObjectURL(croppedFile)
    setPhotoPreview(preview)
    setOcrLoading(true)
    try {
      const result = await processBottleImage(croppedFile)
      const { text, rawText, compressedFile, domaine, vintage, appellation, region, country } = result
      setPhotoFile(compressedFile)

      console.log('🔍 Vérification du domaine dans wine_catalog...')

      // Chercher le domaine dans wine_catalog
      let finalDomaine = domaine
      if (domaine) {
        let hits = await searchWineCatalog(domaine, supabase)

        if (hits.length > 0) {
          console.log(`✅ Vin trouvé: ${hits[0].winery}`)
          setSuggestions(hits)
          setShowSuggestions(true)

          // Remplir le formulaire avec le premier résultat validé
          const selectedWine = hits[0]
          setForm(f => ({
            ...f,
            name: !f.name ? selectedWine.winery : f.name,
            country: !f.country ? selectedWine.country : f.country,
            region: !f.region ? selectedWine.region_1 : f.region,
            appellation: !f.appellation ? selectedWine.variety : f.appellation,
            vintage: !f.vintage || f.vintage === new Date().getFullYear() ? vintage || f.vintage : f.vintage,
          }))

          console.log('📝 Formulaire rempli automatiquement')
        } else {
          console.log(`⚠️ Vin non trouvé dans wine_catalog: ${domaine}`)
          console.log('🔄 Vérification et correction via Claude Vision...')

          // Fallback: vérifier et corriger le nom via Claude Vision
          finalDomaine = await verifyAndCorrectWineName(domaine, appellation, country, supabase)

          // Essayer une nouvelle recherche avec le nom corrigé
          if (finalDomaine !== domaine) {
            console.log(`🔍 Nouvelle recherche avec: ${finalDomaine}`)
            hits = await searchWineCatalog(finalDomaine, supabase)
          }

          if (hits.length > 0) {
            console.log(`✅ Vin trouvé après correction: ${hits[0].winery}`)
            setSuggestions(hits)
            setShowSuggestions(true)

            const selectedWine = hits[0]
            setForm(f => ({
              ...f,
              name: !f.name ? selectedWine.winery : f.name,
              country: !f.country ? selectedWine.country : f.country,
              region: !f.region ? selectedWine.region_1 : f.region,
              appellation: !f.appellation ? selectedWine.variety : f.appellation,
              vintage: !f.vintage || f.vintage === new Date().getFullYear() ? vintage || f.vintage : f.vintage,
            }))

            console.log('📝 Formulaire rempli avec vin corrigé')
          } else {
            console.log(`⚠️ Vin toujours non trouvé, utilisation des données détectées`)
            setSuggestions([])
            setShowSuggestions(false)

            // Remplir avec les données détectées même si non validées
            setForm(f => ({
              ...f,
              name: !f.name ? finalDomaine : f.name,
              country: !f.country ? country : f.country,
              region: !f.region ? region : f.region,
              appellation: !f.appellation ? appellation : f.appellation,
              vintage: !f.vintage || f.vintage === new Date().getFullYear() ? vintage || f.vintage : f.vintage,
            }))
          }
        }
      }

      // Détection du classement 1859 pour Bordeaux
      const hasClassement = detectClassement1859(rawText, region, appellation)
      if (hasClassement) {
        console.log('⭐ Classement 1859 détecté!')
        setForm(f => ({ ...f, is_1859_classified: true }))
      }
    } catch (error) {
      console.error('❌ Erreur OCR:', error)
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.18,
          maxWidthOrHeight: 1200,
          useWebWorker: true
        })
        setPhotoFile(compressed)
      } catch {
        setPhotoFile(file)
      }
    } finally {
      setOcrLoading(false)
    }
  }

  const handleRemovePhoto = () => {
    setPhotoPreview(null)
    setPhotoFile(null)
    setForm(f => ({ ...f, image_url: '' }))
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  const handleSave = async () => {
    setSaving(true)
    let image_url = form.image_url

    if (photoFile) {
      setUploadingPhoto(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const ext = photoFile.name.split('.').pop() || 'jpg'
          const path = `${user.id}/${Date.now()}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from('wine-labels')
            .upload(path, photoFile, { upsert: false })

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('wine-labels')
              .getPublicUrl(path)
            image_url = urlData?.publicUrl ?? ''
          } else {
            console.error('Erreur upload photo:', uploadError.message)
          }
        }
      } catch (err) {
        console.error('Erreur upload photo:', err)
      }
      setUploadingPhoto(false)
    }

    await onSave({
      ...form,
      image_url,
      name: capitalize(form.name),
      country: capitalize(form.country),
      region: capitalize(form.region),
      appellation: capitalize(form.appellation),
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-[500] p-4 flex items-center justify-center overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative my-8 animate-in slide-in-from-bottom-10 duration-500">


        <header className="text-center space-y-1">
          <div className="inline-flex p-3 bg-bordeaux/5 text-bordeaux rounded-full mb-2">
            <WineIcon size={24} />
          </div>
          <h2 className="text-2xl font-serif font-bold text-stone-800 italic">{initialData ? 'Modifier le Flacon' : 'Nouveau Flacon'}</h2>
          {x !== undefined && y !== undefined && (
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Position : {x} , {y}</p>
          )}
        </header>

        <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-2 no-scrollbar">

          {/* Section Photo étiquette */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-stone-400 uppercase ml-3">Photo de l'étiquette</label>

            {photoPreview ? (
              <div className="relative rounded-[1.5rem] overflow-auto border border-stone-100 shadow-sm bg-stone-50" style={{ maxHeight: '300px' }}>
                <img
                  src={photoPreview}
                  alt="Étiquette"
                  className="w-full h-auto block"
                />
                {ocrLoading && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                    <Loader2 size={24} className="text-white animate-spin" />
                    <span className="text-white text-xs font-semibold">Analyse de l'étiquette...</span>
                  </div>
                )}
                <button
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm p-2 rounded-full text-red-400 shadow"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-4 bg-stone-50 rounded-[1.5rem] border-2 border-dashed border-stone-200 hover:border-bordeaux/40 hover:bg-bordeaux/5 transition-all active:scale-95"
                >
                  <Camera size={24} className="text-bordeaux" />
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Appareil photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-4 bg-stone-50 rounded-[1.5rem] border-2 border-dashed border-stone-200 hover:border-bordeaux/40 hover:bg-bordeaux/5 transition-all active:scale-95"
                >
                  <ImagePlus size={24} className="text-bordeaux" />
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Galerie</span>
                </button>
              </div>
            )}

            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelected} />
            <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelected} />
          </div>

          {/* Section 1 : Identité */}
          <div className="space-y-4">
            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-stone-400 uppercase ml-3 flex items-center gap-2">
                Domaine / Cuvée
                {ocrLoading && <Loader2 size={10} className="animate-spin text-bordeaux" />}
              </label>
              <input
                autoFocus
                className="w-full p-4 bg-stone-50 rounded-2xl border-2 border-transparent focus:border-bordeaux/10 focus:bg-white outline-none transition-all"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder={ocrLoading ? "Analyse en cours..." : "Ex: Château Lynch-Bages"}
              />
              {/* Dropdown auto-complétion */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden top-full">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        const country = mapCountry(s.country)
                        const region = mapRegion(country, s.province)
                        const appellation = mapAppellation(region, s.region_1)
                        setForm(f => ({
                          ...f,
                          name: capitalize(s.winery),
                          country,
                          region,
                          appellation,
                          grapes: s.variety || f.grapes,
                        }))
                        setSuggestions([])
                        setShowSuggestions(false)
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors border-b border-stone-50 last:border-0 active:bg-stone-100"
                    >
                      <p className="font-semibold text-sm text-stone-800 truncate">{s.winery}</p>
                      <p className="text-[10px] text-stone-400 truncate">
                        {[s.region_1, s.province, s.country].filter(Boolean).join(' · ')}
                        {s.variety ? ` — ${s.variety}` : ''}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase ml-3">Millésime</label>
                <input
                  type="number"
                  className="w-full p-4 bg-stone-50 rounded-2xl border-none outline-none"
                  placeholder="Optionnel"
                  value={form.vintage ?? ''}
                  onChange={e => setForm({ ...form, vintage: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase ml-3">Couleur</label>
                <select
                  className="w-full p-4 bg-stone-50 rounded-2xl outline-none appearance-none text-sm font-bold"
                  value={form.color}
                  onChange={e => setForm({ ...form, color: e.target.value })}
                >
                  <option value="red">Rouge</option>
                  <option value="white">Blanc</option>
                  <option value="rose">Rosé</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase ml-3">Nombre de bouteilles</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  disabled={Boolean(initialData)}
                  className="w-full p-4 bg-stone-50 rounded-2xl border-none outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>
            </div>
          </div>

          {/* Section 2 : Terroir */}
          <div className="p-5 bg-stone-50 rounded-[2rem] space-y-4">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Terroir</p>
            <Combobox
              label="Pays"
              value={form.country}
              onChange={handleCountryChange}
              suggestions={countrySuggestions}
              placeholder="France..."
            />
            <Combobox
              label="Région"
              value={form.region}
              onChange={handleRegionChange}
              suggestions={regionSuggestions}
              placeholder={regionList.length ? `${regionList[0]}...` : 'Bordeaux...'}
            />
            <Combobox
              label="Appellation"
              value={form.appellation}
              onChange={v => setForm(f => ({ ...f, appellation: v }))}
              suggestions={appellationSuggestions}
              placeholder={appellationList.length ? `${appellationList[0]}...` : 'Pauillac...'}
            />
          </div>

          {/* Section 3 : Caractéristiques */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase ml-3">Style</label>
              <select className="w-full p-4 bg-stone-50 rounded-2xl text-xs font-bold outline-none" value={form.style} onChange={e => setForm({ ...form, style: e.target.value })}>
                <option value="still">Tranquille</option>
                <option value="sparkling">Effervescent</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase ml-3">Sucre</label>
              <select className="w-full p-4 bg-stone-50 rounded-2xl text-xs font-bold outline-none" value={form.sweetness} onChange={e => setForm({ ...form, sweetness: e.target.value })}>
                <option value="dry">Sec</option>
                <option value="sweet">Moelleux / Doux</option>
              </select>
            </div>
          </div>

          {/* Classement 1859 */}
          <label className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${form.is_1859_classified ? 'border-amber-200 bg-amber-50' : 'border-stone-100 bg-white'}`}>
            <div className="flex items-center gap-3">
              <Star size={18} className={form.is_1859_classified ? 'text-amber-500 fill-amber-500' : 'text-stone-300'} />
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-600">Classement 1859</span>
            </div>
            <input
              type="checkbox"
              className="w-5 h-5 accent-amber-500 rounded-lg"
              checked={form.is_1859_classified}
              onChange={e => setForm({ ...form, is_1859_classified: e.target.checked })}
            />
          </label>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-400 uppercase ml-3">Année d'apogée conseillée</label>
            <input
              type="number"
              className="w-full p-4 bg-stone-50 rounded-2xl outline-none font-bold text-bordeaux"
              value={form.peak_date}
              onChange={e => setForm({ ...form, peak_date: parseInt(e.target.value) })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-400 uppercase ml-3">Prix d'achat (€)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              className="w-full p-4 bg-stone-50 rounded-2xl outline-none font-bold text-stone-700"
              value={form.price || ''}
              placeholder="0.00"
              onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-5 text-stone-400 font-bold rounded-[2rem] hover:text-stone-600 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-5 bg-bordeaux text-white rounded-[2rem] font-bold shadow-xl shadow-bordeaux/20 flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-stone-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                {uploadingPhoto ? 'Upload...' : 'Sauvegarde...'}
              </>
            ) : (
              <>
                <Save size={20} />
                Placer
              </>
            )}
          </button>
        </div>
      </div>

      {/* --- MODAL CROP D'IMAGE --- */}
      {showCropModal && pendingPhotoFile && (
        <ImageCropModal
          imageUrl={pendingPhotoFile.preview}
          imageFile={pendingPhotoFile.file}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropModal(false)
            setPendingPhotoFile(null)
          }}
        />
      )}
    </div>
  )
}
