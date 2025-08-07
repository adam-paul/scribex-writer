<script lang="ts">
  import Modal from './Modal.svelte';
  import { projectStore } from '$lib/stores/projects';
  import type { Project } from '$lib/models/Project';
  import { formatDate } from '$lib/utils/dateFormat';
  
  interface Props {
    showModal: boolean;
    onclose: () => void;
  }
  
  let { showModal, onclose }: Props = $props();
  
  const currentProject = projectStore.currentProject;
  let projects = $state<Project[]>([]);
  
  // Subscribe to all projects
  $effect(() => {
    const unsubscribe = projectStore.subscribe(p => projects = p);
    return unsubscribe;
  });
  
  function createNewProject() {
    const title = prompt('Enter project title:', 'Untitled Project');
    if (title) {
      projectStore.create(title);
      onclose();
    }
  }
  
  function switchProject(projectId: string) {
    projectStore.switchTo(projectId);
    onclose();
  }
  
  function deleteProject(e: Event, projectId: string) {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      projectStore.delete(projectId);
    }
  }
  
</script>

<Modal showModal={showModal} title="My Projects" onclose={onclose}>
  <button 
    id="new-project-btn" 
    class="primary-btn" 
    onclick={createNewProject}
  >
    + New Project
  </button>
  
  <div id="project-list" class="project-list">
    {#each [...projects].sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()) as project}
      <div 
        class="project-item {project.id === $currentProject?.id ? 'active' : ''}"
        onclick={() => switchProject(project.id)}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === 'Enter' && switchProject(project.id)}
      >
        <div class="project-info">
          <div class="project-title">{project.title}</div>
          <div class="project-meta">
            {project.wordCount || 0} words • {formatDate(project.lastModified)}
          </div>
        </div>
        <div class="project-actions">
          <button 
            class="icon-btn" 
            onclick={(e) => deleteProject(e, project.id)}
            title="Delete project"
          >
            🗑️
          </button>
        </div>
      </div>
    {/each}
  </div>
</Modal>

<style>
  #new-project-btn.primary-btn {
    width: 100%;
    margin-bottom: var(--space-md);
  }

  .project-list {
    margin-top: var(--space-lg);
    max-height: 400px;
    overflow-y: auto;
  }

  .project-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.8);
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .project-item:hover {
    background-color: #f5f5f5;
    border-color: var(--color-border);
  }

  .project-item.active {
    background-color: var(--color-paper-accent);
    border-color: var(--color-border);
  }

  .project-info {
    flex: 1;
    min-width: 0; /* Allow text truncation */
  }

  .project-title {
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .project-meta {
    font-size: 0.85em;
    color: var(--color-text-muted);
  }

  .project-actions {
    flex-shrink: 0;
    margin-left: 12px;
  }

  /* Icon button - scoped to this component */
  .icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s;
    font-size: 18px;
    padding: var(--space-xs) var(--space-sm);
  }

  .icon-btn:hover {
    opacity: 1;
  }
</style>