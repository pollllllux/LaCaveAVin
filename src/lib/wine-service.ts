import { createWorker } from 'tesseract.js';
import imageCompression from 'browser-image-compression';

export async function processBottleImage(file: File) {
  // Spec 16: Compression < 200Ko
  const options = { maxSizeMB: 0.19, maxWidthOrHeight: 1200, useWebWorker: true };
  const compressedFile = await imageCompression(file, options);

  // Spec 18: OCR Local (Gratuit)
  const worker = await createWorker('fra');
  const { data: { text } } = await worker.recognize(compressedFile);
  await worker.terminate();

  return { text, compressedFile };
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

function normalize(s: string): string {
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
