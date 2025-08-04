<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projects';
  import { uiStore } from '$lib/stores/ui';
  import ProjectModal from '$lib/components/ProjectModal.svelte';
  import PromptModal from '$lib/components/PromptModal.svelte';
  
  let { children } = $props();
  
  // Subscribe to stores
  const currentProject = projectStore.currentProject;
  const saveStatus = projectStore.saveStatus;
  
  // Modal visibility from UI store - directly derived
  const showProjectModal = $derived($uiStore.showProjectModal);
  const showPromptModal = $derived($uiStore.showPromptModal);
  
  onMount(() => {
    projectStore.init();
  });
  
  function handleTitleBlur(e: Event) {
    const target = e.target as HTMLElement;
    const newTitle = target.textContent?.trim();
    if (newTitle && $currentProject) {
      projectStore.updateTitle($currentProject.id, newTitle);
    }
  }
  
  function handleTitleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  }
</script>

<svelte:head>
  <title>Scribex</title>
</svelte:head>

<nav class="main-nav">
  <div class="nav-left">
    <button 
      id="project-menu-btn"
      class="icon-btn" 
      title="Project Menu"
      onclick={() => uiStore.openProjectModal()}
    >
      ☰
    </button>
    {#if $currentProject}
      <h3 
        contenteditable="true"
        onblur={handleTitleBlur}
        onkeydown={handleTitleKeydown}
      >
        {$currentProject.title}
      </h3>
    {/if}
  </div>
  
  <div class="nav-tabs">
    <a href="/" class="nav-tab" class:active={$page.url.pathname === '/'}>
      ✍️ Write
    </a>
    <a href="/dashboard" class="nav-tab" class:active={$page.url.pathname.startsWith('/dashboard')}>
      📊 Dashboard
    </a>
    <a href="/profile" class="nav-tab" class:active={$page.url.pathname.startsWith('/profile')}>
      👤 Profile
    </a>
  </div>
  
  <div class="nav-right">
    {#if $saveStatus !== 'hidden'}
      <div class="save-indicator {$saveStatus}">
        {#if $saveStatus === 'saved'}
          All changes saved
        {:else if $saveStatus === 'saving'}
          Saving...
        {:else}
          Unsaved changes
        {/if}
      </div>
    {/if}
  </div>
</nav>

<main class="content-area">
  {@render children?.()}
</main>

<!-- Modals -->
<ProjectModal showModal={showProjectModal} />
<PromptModal showModal={showPromptModal} />

<style>
  .main-nav {
    background-color: var(--color-paper-light);
    border-bottom: 2px solid var(--color-border);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1002;
    height: var(--nav-height);
    display: flex;
    align-items: center;
    padding: 0 var(--space-lg);
  }

  /* Nav sections */
  .nav-left, .nav-right {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .nav-left {
    gap: 10px;
  }

  .nav-right {
    justify-content: flex-end;
  }

  .nav-tabs {
    display: flex;
    height: 100%;
    max-width: 600px;
    flex: 0 0 auto;
  }

  /* Project title in nav */
  .nav-left h3 {
    margin: 0;
    font-size: 16px;
    font-weight: normal;
    padding: var(--space-xs) var(--space-sm);
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    cursor: text;
    max-width: 300px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-left h3:hover {
    background-color: rgba(255, 255, 255, 0.5);
    border-color: #ddd;
  }

  .nav-left h3:focus {
    outline: none;
    background-color: white;
    border-color: var(--color-border);
    white-space: normal;
    overflow: visible;
  }

  .nav-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-sm) 12px;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    transition: var(--transition);
    border-bottom: 3px solid transparent;
    text-decoration: none;
    color: var(--color-text);
  }

  .nav-tab:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .nav-tab.active {
    border-bottom-color: var(--color-primary);
    background-color: rgba(76, 175, 80, 0.1);
  }

  /* Content area */
  .content-area {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  /* Save indicator */
  .save-indicator {
    padding: var(--space-sm) var(--space-md);
    border-radius: 4px;
    font-size: 14px;
    transition: var(--transition);
    display: block;
  }

  /* Save indicator states */
  .save-indicator.unsaved {
    background-color: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
  }

  .save-indicator.saving {
    background-color: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
  }

  .save-indicator.saved {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .save-indicator.error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .main-nav {
      height: 50px;
      padding: 0 10px;
    }
    
    .nav-left {
      flex: 0 0 auto;
    }
    
    .nav-left h3 {
      max-width: 120px;
      font-size: 14px;
    }
    
    .nav-tabs {
      padding: 0 10px;
    }
    
    .nav-tab {
      font-size: 12px;
      padding: var(--space-xs) var(--space-sm);
    }
  }
</style>