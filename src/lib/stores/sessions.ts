import { writable, get } from 'svelte/store';
import { STORAGE_KEYS } from '$lib/constants/storage';

interface WritingSession {
  date: string;
  duration: number;
  wordsWritten: number;
  projectId: string;
}

function createSessionsStore() {
  const { subscribe, set, update } = writable<WritingSession[]>([]);

  // Load sessions from localStorage on init
  function loadSessions() {
    const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (stored) {
      set(JSON.parse(stored));
    }
  }

  // Save sessions to localStorage
  function saveSessions(sessions: WritingSession[]) {
    // Keep only last 30 days of data
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentSessions = sessions.filter(s => 
      new Date(s.date).getTime() > thirtyDaysAgo
    );
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(recentSessions));
  }

  return {
    subscribe,
    
    init() {
      loadSessions();
    },

    recordSession(wordsWritten: number, duration: number, projectId: string) {
      const session: WritingSession = {
        date: new Date().toISOString(),
        duration,
        wordsWritten,
        projectId
      };

      update(sessions => {
        const updated = [...sessions, session];
        saveSessions(updated);
        return updated;
      });
    },

    calculateStreak(): number {
      const sessions = get({ subscribe });
      
      if (sessions.length === 0) return 0;
      
      // Get unique dates when writing occurred
      const dates = [...new Set(sessions.map(s => new Date(s.date).toDateString()))];
      dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      let streak = 0;
      let currentDate = new Date();
      
      for (let i = 0; i < dates.length; i++) {
        const dateStr = currentDate.toDateString();
        if (dates.includes(dateStr)) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else if (i === 0 && dateStr !== dates[0]) {
          // Today hasn't been written yet, check yesterday
          currentDate.setDate(currentDate.getDate() - 1);
          i--; // Check again with yesterday's date
        } else {
          break;
        }
      }
      
      return streak;
    },

    getTodaysWords(): number {
      const sessions = get({ subscribe });
      const today = new Date().toDateString();
      
      return sessions
        .filter(s => new Date(s.date).toDateString() === today)
        .reduce((sum, s) => sum + s.wordsWritten, 0);
    },

    getTotalSessions(): number {
      return get({ subscribe }).length;
    }
  };
}

export const sessions = createSessionsStore();