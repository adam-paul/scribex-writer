import { writable, derived, get } from 'svelte/store';
import type { Project } from '$lib/models/Project';
import { createProject, countWords } from '$lib/models/Project';
import { StorageService } from '$lib/services/storage';

function createProjectStore() {
  // All projects
  const projects = writable<Project[]>([]);
  
  // Current project ID
  const currentProjectId = writable<string | null>(null);
  
  // Derived store for current project
  const currentProject = derived(
    [projects, currentProjectId],
    ([$projects, $currentId]) => 
      $projects.find(p => p.id === $currentId) || null
  );

  // Save status
  const saveStatus = writable<'saved' | 'saving' | 'unsaved' | 'hidden'>('hidden');

  return {
    subscribe: projects.subscribe,
    currentProject,
    saveStatus,
    
    // Initialize from localStorage
    init() {
      const storedProjects = StorageService.getAllProjects();
      const storedCurrentId = StorageService.getCurrentProjectId();
      
      if (storedProjects.length === 0) {
        // Create first project
        const newProject = createProject();
        projects.set([newProject]);
        currentProjectId.set(newProject.id);
        StorageService.saveProjects([newProject]);
        StorageService.setCurrentProjectId(newProject.id);
      } else {
        projects.set(storedProjects);
        currentProjectId.set(storedCurrentId || storedProjects[0].id);
      }
    },

    // Create new project
    create(title?: string) {
      const newProject = createProject(title);
      projects.update(p => {
        const updated = [...p, newProject];
        StorageService.saveProjects(updated);
        return updated;
      });
      currentProjectId.set(newProject.id);
      StorageService.setCurrentProjectId(newProject.id);
      return newProject;
    },

    // Update project content
    updateContent(projectId: string, content: string) {
      saveStatus.set('saving');
      projects.update(projectList => {
        const updated = projectList.map(p => 
          p.id === projectId 
            ? { ...p, content, wordCount: countWords(content), lastModified: new Date().toISOString() }
            : p
        );
        StorageService.saveProjects(updated);
        setTimeout(() => {
          saveStatus.set('saved');
          // Fade out after 2 seconds
          setTimeout(() => saveStatus.set('hidden'), 2000);
        }, 300); // Small delay for visual feedback
        return updated;
      });
    },

    // Update project title
    updateTitle(projectId: string, title: string) {
      projects.update(projectList => {
        const updated = projectList.map(p => 
          p.id === projectId 
            ? { ...p, title, lastModified: new Date().toISOString() }
            : p
        );
        StorageService.saveProjects(updated);
        return updated;
      });
    },

    // Save AI response
    saveAIResponse(projectId: string, aiResponse: string) {
      projects.update(projectList => {
        const updated = projectList.map(p => 
          p.id === projectId 
            ? { ...p, aiResponse }
            : p
        );
        StorageService.saveProjects(updated);
        return updated;
      });
    },

    // Clear AI response
    clearAIResponse(projectId: string) {
      projects.update(projectList => {
        const updated = projectList.map(p => 
          p.id === projectId 
            ? { ...p, aiResponse: null }
            : p
        );
        StorageService.saveProjects(updated);
        return updated;
      });
    },

    // Switch current project
    switchTo(projectId: string) {
      const projectList = get(projects);
      if (projectList.find(p => p.id === projectId)) {
        currentProjectId.set(projectId);
        StorageService.setCurrentProjectId(projectId);
      }
    },

    // Delete project
    delete(projectId: string) {
      const projectList = get(projects);
      const filtered = projectList.filter(p => p.id !== projectId);
      
      projects.set(filtered);
      StorageService.saveProjects(filtered);
      
      // If we deleted the current project, switch to another
      if (get(currentProjectId) === projectId) {
        if (filtered.length > 0) {
          this.switchTo(filtered[0].id);
        } else {
          // Create new if none left
          this.create();
        }
      }
    },

    // Get all projects
    getAll() {
      return get(projects);
    }
  };
}

export const projectStore = createProjectStore();