/**
 * Capitalise chaque mot : "domaine beyer" → "Domaine Beyer"
 */
export function capitalize(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
