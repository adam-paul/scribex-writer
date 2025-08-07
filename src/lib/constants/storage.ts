export const STORAGE_KEYS = {
  PROJECTS: 'scribex-projects',
  CURRENT_PROJECT: 'scribex-current-project', 
  SESSIONS: 'scribex-sessions',
  PROMPT: 'scribex-prompt',
  FONT_FAMILY: 'scribex-font-family',
  FONT_SIZE: 'scribex-font-size'
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];