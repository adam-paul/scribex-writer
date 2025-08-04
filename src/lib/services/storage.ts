import type { Project } from '$lib/models/Project';

export class StorageService {
  private static readonly PROJECTS_KEY = 'scribex-projects';
  private static readonly CURRENT_PROJECT_KEY = 'scribex-current-project';
  private static readonly PROMPT_KEY = 'scribex-prompt';

  static getAllProjects(): Project[] {
    try {
      const stored = localStorage.getItem(this.PROJECTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load projects:', error);
      return [];
    }
  }

  static saveProjects(projects: Project[]): void {
    try {
      localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projects));
    } catch (error) {
      console.error('Failed to save projects:', error);
    }
  }

  static getCurrentProjectId(): string | null {
    return localStorage.getItem(this.CURRENT_PROJECT_KEY);
  }

  static setCurrentProjectId(id: string): void {
    localStorage.setItem(this.CURRENT_PROJECT_KEY, id);
  }

  static getCustomPrompt(): string | null {
    return localStorage.getItem(this.PROMPT_KEY);
  }

  static setCustomPrompt(prompt: string): void {
    localStorage.setItem(this.PROMPT_KEY, prompt);
  }
}