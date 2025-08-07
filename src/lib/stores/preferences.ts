import { writable } from 'svelte/store';
import { STORAGE_KEYS } from '$lib/constants/storage';

interface Preferences {
  fontFamily: string;
  fontSize: string;
}

function createPreferencesStore() {
  const defaultPreferences: Preferences = {
    fontFamily: "'Courier New', monospace",
    fontSize: '16px'
  };

  // Load from localStorage
  const stored = typeof window !== 'undefined' ? {
    fontFamily: localStorage.getItem(STORAGE_KEYS.FONT_FAMILY) || defaultPreferences.fontFamily,
    fontSize: localStorage.getItem(STORAGE_KEYS.FONT_SIZE) || defaultPreferences.fontSize
  } : defaultPreferences;

  const { subscribe, set, update } = writable<Preferences>(stored);

  return {
    subscribe,
    
    setFontFamily(fontFamily: string) {
      update(prefs => {
        localStorage.setItem(STORAGE_KEYS.FONT_FAMILY, fontFamily);
        return { ...prefs, fontFamily };
      });
    },
    
    setFontSize(fontSize: string) {
      update(prefs => {
        localStorage.setItem(STORAGE_KEYS.FONT_SIZE, fontSize);
        return { ...prefs, fontSize };
      });
    },
    
    reset() {
      set(defaultPreferences);
      localStorage.removeItem(STORAGE_KEYS.FONT_FAMILY);
      localStorage.removeItem(STORAGE_KEYS.FONT_SIZE);
    }
  };
}

export const preferences = createPreferencesStore();