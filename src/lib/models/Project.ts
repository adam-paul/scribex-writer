export interface InlineFeedback {
  id: string;
  type: 'grammar' | 'clarity' | 'flow' | 'tone' | 'praise';
  message: string;
  startIndex: number;
  endIndex: number;
  createdAt: string;
  dismissed: boolean;
}

export interface Project {
  id: string;
  title: string;
  content: string;
  created: string;
  lastModified: string;
  wordCount: number;
  genre: 'general' | 'narrative' | 'persuasive' | 'descriptive' | 'creative';
  aiResponse: string | null;
  // New fields for inline feedback (optional for backward compatibility)
  inlineFeedback?: InlineFeedback[];
  lastAnalyzedPosition?: number;
}

export function createProject(title: string = 'Untitled Project'): Project {
  return {
    id: `project_${Date.now()}`,
    title,
    content: '',
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    wordCount: 0,
    genre: 'general',
    aiResponse: null,
    inlineFeedback: [],
    lastAnalyzedPosition: 0
  };
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length || 0;
}