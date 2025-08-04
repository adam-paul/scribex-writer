import { writable } from 'svelte/store';

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
    fontFamily: localStorage.getItem('scribex-font-family') || defaultPreferences.fontFamily,
    fontSize: localStorage.getItem('scribex-font-size') || defaultPreferences.fontSize
  } : defaultPreferences;

  const { subscribe, set, update } = writable<Preferences>(stored);

  return {
    subscribe,
    
    setFontFamily(fontFamily: string) {
      update(prefs => {
        localStorage.setItem('scribex-font-family', fontFamily);
        return { ...prefs, fontFamily };
      });
    },
    
    setFontSize(fontSize: string) {
      update(prefs => {
        localStorage.setItem('scribex-font-size', fontSize);
        return { ...prefs, fontSize };
      });
    },
    
    reset() {
      set(defaultPreferences);
      localStorage.removeItem('scribex-font-family');
      localStorage.removeItem('scribex-font-size');
    }
  };
}

export const preferences = createPreferencesStore();