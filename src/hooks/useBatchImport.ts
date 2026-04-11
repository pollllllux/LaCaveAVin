import { supabase } from '@/lib/supabase'

export interface BatchItem {
  id: string
  user_id: string
  status: 'pending' | 'done' | 'error'
  image_url: string | null
  name: string | null
  vintage: number | null
  appellation: string | null
  region: string | null
  country: string | null
  color: 'red' | 'white' | 'rose' | ''
  is_1859: boolean
  raw_text: string | null
  error_message: string | null
  created_at: string
}

/**
 * Charge tous les batch items d'un utilisateur
 */
export async function loadBatch(userId: string): Promise<BatchItem[]> {
  const { data, error } = await supabase
    .from('batch_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erreur chargement batch:', error.message)
    return []
  }

  return data || []
}

/**
 * Ajoute de nouveaux items au batch
 */
export async function addBatchItems(userId: string, items: Omit<BatchItem, 'id' | 'user_id' | 'created_at'>[]): Promise<BatchItem[]> {
  const itemsWithUser = items.map(item => ({
    ...item,
    user_id: userId
  }))

  const { data, error } = await supabase
    .from('batch_items')
    .insert(itemsWithUser)
    .select()

  if (error) {
    console.error('Erreur insertion batch items:', error.message)
    return []
  }

  return data || []
}

/**
 * Met à jour un item du batch
 */
export async function updateBatchItem(
  id: string,
  fields: Partial<Omit<BatchItem, 'id' | 'user_id' | 'created_at'>>
): Promise<BatchItem | null> {
  const { data, error } = await supabase
    .from('batch_items')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erreur update batch item:', error.message)
    return null
  }

  return data
}

/**
 * Supprime un item du batch
 */
export async function removeBatchItem(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('batch_items')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erreur suppression batch item:', error.message)
    return false
  }

  return true
}

/**
 * Vide complètement le batch d'un utilisateur
 */
export async function clearBatch(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('batch_items')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.error('Erreur vidage batch:', error.message)
    return false
  }

  return true
}

/**
 * Upload une image compressée dans Supabase Storage
 */
export async function uploadBatchImage(userId: string, file: File): Promise<string | null> {
  try {
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `batch_${Date.now()}.${ext}`
    const path = `${userId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('wine-labels')
      .upload(path, file, { upsert: false })

    if (uploadError) {
      console.error('Erreur upload image:', uploadError.message)
      return null
    }

    const { data: urlData } = supabase.storage
      .from('wine-labels')
      .getPublicUrl(path)

    return urlData?.publicUrl || null
  } catch (error) {
    console.error('Erreur upload batch image:', error)
    return null
  }
}
