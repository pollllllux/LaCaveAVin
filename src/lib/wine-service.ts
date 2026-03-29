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

// Spec 17 & 18: Simulation de recherche discrète
export async function fetchWineData(query: string) {
  console.log("Recherche discrète pour:", query);
  // Ici le dev implémenterait le parsing via Proxy de Wine-Searcher
  return { name: "Château Margaux", vintage: 2015, region: "Bordeaux" };
}
