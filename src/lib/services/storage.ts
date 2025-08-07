import type { Project } from '$lib/models/Project';
import { STORAGE_KEYS } from '$lib/constants/storage';

export class StorageService {

  static getAllProjects(): Project[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load projects:', error);
      return [];
    }
  }

  static saveProjects(projects: Project[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    } catch (error) {
      console.error('Failed to save projects:', error);
    }
  }

  static getCurrentProjectId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT);
  }

  static setCurrentProjectId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, id);
  }

  static getCustomPrompt(): string | null {
    return localStorage.getItem(STORAGE_KEYS.PROMPT);
  }

  static setCustomPrompt(prompt: string): void {
    localStorage.setItem(STORAGE_KEYS.PROMPT, prompt);
  }
}