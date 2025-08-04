<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { projectStore } from '$lib/stores/projects';
  import { sessions } from '$lib/stores/sessions';
  import type { Project } from '$lib/models/Project';
  
  // Get all projects
  let projects = $state<Project[]>([]);
  $effect(() => {
    projects = projectStore.getAll();
  });
  
  // Calculate stats
  const totalWords = $derived(projects.reduce((sum, p) => sum + (p.wordCount || 0), 0));
  const totalProjects = $derived(projects.length);
  
  // Writing streak
  let writingStreak = $state(0);
  
  // Get recent projects sorted by last modified
  const recentProjects = $derived([...projects]
    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
    .slice(0, 5));
  
  onMount(() => {
    sessions.init();
    writingStreak = sessions.calculateStreak();
  });
  
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return diffMinutes === 0 ? 'Just now' : `${diffMinutes} minutes ago`;
      }
      return `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
  
  function openProject(projectId: string) {
    projectStore.switchTo(projectId);
    goto('/');
  }
</script>

<div class="dashboard-container">
  <h2>Writing Dashboard</h2>
  <div class="stats-grid">
    <div class="stat-card">
      <h3>Total Words</h3>
      <p class="stat-value">{totalWords.toLocaleString()}</p>
    </div>
    <div class="stat-card">
      <h3>Projects</h3>
      <p class="stat-value">{totalProjects}</p>
    </div>
    <div class="stat-card">
      <h3>Writing Streak</h3>
      <p class="stat-value">{writingStreak} {writingStreak === 1 ? 'day' : 'days'}</p>
    </div>
  </div>
  
  <div class="recent-projects">
    <h3>Recent Projects</h3>
    <div class="dashboard-project-list">
      {#each recentProjects as project}
        <button 
          class="project-summary"
          onclick={() => openProject(project.id)}
          type="button"
        >
          <h4>{project.title}</h4>
          <p>{project.wordCount || 0} words • {formatDate(project.lastModified)}</p>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .dashboard-container {
    padding: var(--space-lg);
    max-width: 1200px;
    margin: 0 auto;
  }

  .dashboard-container h2 {
    margin-bottom: 2rem;
    font-size: 2rem;
    color: var(--color-text);
  }

  /* Stats grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-lg);
    margin-bottom: 40px;
  }

  .stat-card {
    background-color: rgba(255, 255, 255, 0.8);
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: var(--space-lg);
    text-align: center;
  }

  .stat-card h3 {
    margin: 0 0 10px 0;
    font-size: 16px;
    color: var(--color-text-muted);
  }

  .stat-card .stat-value {
    font-size: 32px;
    font-weight: bold;
    color: var(--color-text);
    margin: 0;
  }

  /* Recent projects section */
  .recent-projects {
    margin-top: 3rem;
  }

  .recent-projects h3 {
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
    color: var(--color-text);
  }

  .dashboard-project-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .project-summary {
    display: block;
    width: 100%;
    text-align: left;
    background-color: rgba(255, 255, 255, 0.8);
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 15px;
    cursor: pointer;
    transition: var(--transition-fast);
    font: inherit;
    color: inherit;
  }

  .project-summary:hover {
    background-color: rgba(255, 255, 255, 0.95);
    border-color: var(--color-border);
    transform: translateY(-1px);
  }

  .project-summary h4 {
    margin: 0 0 8px 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .project-summary p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }

    .dashboard-container {
      padding: var(--space-md);
    }

    .dashboard-container h2 {
      font-size: 1.5rem;
    }

    .recent-projects h3 {
      font-size: 1.25rem;
    }
  }
</style>