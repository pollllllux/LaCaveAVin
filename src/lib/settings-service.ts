import { supabase } from './supabase'

export interface UserSettings {
  blink_duration: number
  timeout_duration: number
  display_density: 'compact' | 'normal' | 'spacious'
}

const DEFAULTS: UserSettings = {
  blink_duration: 15,
  timeout_duration: 5,
  display_density: 'normal',
}

export async function fetchUserSettings(): Promise<UserSettings> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return DEFAULTS

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.warn('Erreur fetch settings:', error.message)
      return DEFAULTS
    }

    if (!data) {
      // Create default settings for this user
      await createDefaultSettings(user.id)
      return DEFAULTS
    }

    return {
      blink_duration: data.blink_duration ?? DEFAULTS.blink_duration,
      timeout_duration: data.timeout_duration ?? DEFAULTS.timeout_duration,
      display_density: data.display_density ?? DEFAULTS.display_density,
    }
  } catch (err) {
    console.error('Erreur settings:', err)
    return DEFAULTS
  }
}

export async function saveUserSettings(settings: UserSettings): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id: user.id,
          blink_duration: settings.blink_duration,
          timeout_duration: settings.timeout_duration,
          display_density: settings.display_density,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error('Erreur save settings:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('Erreur save settings:', err)
    return false
  }
}

async function createDefaultSettings(userId: string): Promise<void> {
  try {
    await supabase
      .from('user_settings')
      .insert({
        user_id: userId,
        ...DEFAULTS,
      })
  } catch (err) {
    console.warn('Could not create default settings:', err)
  }
}

// Sync settings to localStorage for fast access
export function syncSettingsToLocalStorage(settings: UserSettings): void {
  localStorage.setItem('blinkDuration', settings.blink_duration.toString())
  localStorage.setItem('timeoutDuration', settings.timeout_duration.toString())
  localStorage.setItem('displayDensity', settings.display_density)
}
