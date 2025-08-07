export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
}

export abstract class BaseStorageService<T> {
  constructor(protected key: string) {}
  
  protected safeGet(): T | null {
    try {
      const stored = localStorage.getItem(this.key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error(`Failed to read ${this.key}:`, error);
      return null;
    }
  }
  
  protected safeSave(data: T): boolean {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Failed to save ${this.key}:`, error);
      return false;
    }
  }
}