<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projects';
  import { StorageService } from '$lib/services/storage';
  import { uiStore } from '$lib/stores/ui';
  import { preferences } from '$lib/stores/preferences';
  import { sessions } from '$lib/stores/sessions';
  
  // Subscribe to current project
  const currentProject = projectStore.currentProject;
  
  let editorContent = $state('');
  let processing = $state(false);
  let defaultPromptLoaded = $state(false);
  let saveTimer = $state<number>();
  
  // Load content when project changes
  $effect(() => {
    if ($currentProject) {
      editorContent = $currentProject.content;
    }
  });
  
  // Auto-save on content change
  $effect(() => {
    if ($currentProject && editorContent !== $currentProject.content) {
      projectStore.saveStatus.set('unsaved');
      clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        projectStore.updateContent($currentProject.id, editorContent);
      }, 2000);
    }
  });
  
  // Word counting - reactive statements
  const wordCount = $derived(editorContent.trim().split(/\s+/).filter(w => w.length > 0).length || 0);
  const charCount = $derived(editorContent.length);
  const readingTime = $derived(Math.ceil(wordCount / 200));
  
  // Session tracking
  let sessionStartWords = $state(0);
  let sessionStartTime = $state(Date.now());
  const sessionWords = $derived(wordCount - sessionStartWords);
  
  // Initialize session on mount and when project changes
  onMount(() => {
    sessions.init();
    
    if ($currentProject) {
      sessionStartWords = $currentProject.wordCount || 0;
      sessionStartTime = Date.now();
    }
    
    // Record session on page unload
    const recordAndCleanup = () => {
      if ($currentProject && sessionWords > 0) {
        const duration = Date.now() - sessionStartTime;
        sessions.recordSession(sessionWords, duration, $currentProject.id);
      }
    };
    
    // Save session before page unload
    window.addEventListener('beforeunload', recordAndCleanup);
    
    // Save when switching tabs/windows
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        recordAndCleanup();
      } else {
        // Reset session start when returning
        sessionStartWords = wordCount;
        sessionStartTime = Date.now();
      }
    });
    
    return () => {
      window.removeEventListener('beforeunload', recordAndCleanup);
    };
  });
  
  // Reset session when project changes
  $effect(() => {
    if ($currentProject) {
      sessionStartWords = $currentProject.wordCount || 0;
      sessionStartTime = Date.now();
    }
  });
  
  // Show AI response if it exists
  const showAIResponse = $derived(!!$currentProject?.aiResponse);
  const aiResponse = $derived($currentProject?.aiResponse || '');
  
  // Load default prompt on mount
  onMount(async () => {
    try {
      const response = await fetch('/prompts/overall-critique.md');
      if (response.ok) {
        const defaultPrompt = await response.text();
        // Only set if user hasn't saved a custom prompt
        if (!StorageService.getCustomPrompt()) {
          StorageService.setCustomPrompt(defaultPrompt.trim());
        }
        defaultPromptLoaded = true;
      }
    } catch (error) {
      console.error('Failed to load default prompt:', error);
    }
  });
  
  // For now, we'll handle the Process Text button without HTMX
  async function processText() {
    if (!editorContent.trim() || processing) return;
    
    processing = true;
    
    try {
      const customPrompt = StorageService.getCustomPrompt() || '';
      
      const response = await fetch('/api/process-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          editor_content: editorContent,
          custom_prompt: customPrompt
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseText = await response.text();
      if ($currentProject) {
        projectStore.saveAIResponse($currentProject.id, responseText);
      }
    } catch (error) {
      console.error('Error processing text:', error);
      alert('Error processing text. Please try again.');
    } finally {
      processing = false;
    }
  }
</script>

<div class="editor-container">
  <div class="editor-content">
    <textarea 
      bind:value={editorContent}
      id="editor" 
      name="editor_content"
      style="font-family: {$preferences.fontFamily}; font-size: {$preferences.fontSize};"
    ></textarea>
    
    {#if showAIResponse}
      <div id="llm-output">
        {@html aiResponse}
        <button 
          class="llm-close" 
          onclick={() => $currentProject && projectStore.clearAIResponse($currentProject.id)}
        >
          ×
        </button>
      </div>
    {/if}
  </div>

  <div class="footer" id="editor-footer">
  <div class="footer-section footer-buttons">
    <button id="edit-prompt-btn" onclick={() => uiStore.openPromptModal()}>Edit Prompt</button>
    <button id="process-text-btn" onclick={processText} disabled={processing}>
      {processing ? 'Processing...' : 'Process Text'}
    </button>
  </div>
  
  <div class="footer-divider"></div>
  
  <div class="footer-section footer-stats">
    <div class="stat-item">
      <span class="stat-label">Words:</span>
      <span class="stat-value">{wordCount.toLocaleString()}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Characters:</span>
      <span class="stat-value">{charCount.toLocaleString()}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Reading time:</span>
      <span class="stat-value">{readingTime} min</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Session:</span>
      <span class="stat-value {sessionWords < 0 ? 'negative' : ''}" id="session-words">
        {sessionWords >= 0 ? `+${sessionWords}` : sessionWords}
      </span>
    </div>
  </div>
</div>
</div>

<style>
  .editor-container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .editor-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: relative;
    overflow: hidden;
  }

  #editor {
    width: 100%;
    flex: 1;
    border: none;
    resize: none;
    outline: none;
    padding: var(--space-lg);
    box-sizing: border-box;
    font-family: 'Courier New', monospace;
    font-size: 16px;
    color: var(--color-text);
    overflow-y: auto;
    background-color: transparent;
    scrollbar-width: thin;
    scrollbar-color: rgba(0,0,0,0.2) transparent;
    min-height: 0;
    line-height: 1.6;
  }

  /* Output area */
  #llm-output {
    background-color: var(--color-paper-accent);
    padding: 10px var(--space-lg);
    padding-right: 40px; /* Space for close button */
    border-top: 1px solid var(--color-border);
    min-height: 30px;
    max-height: 30vh;
    overflow-y: auto;
    white-space: pre-wrap;
    font-size: 0.9em;
    box-sizing: border-box;
    position: relative;
    flex-shrink: 0;
  }

  .llm-close {
    position: absolute;
    top: 8px;
    right: 10px;
    font-size: 20px;
    line-height: 1;
    color: var(--color-text-muted);
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  .llm-close:hover {
    opacity: 1;
  }

  /* Footer */
  .footer {
    width: 100%;
    height: var(--footer-height);
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--color-paper-light);
    border-top: 1px solid var(--color-border);
    gap: var(--space-lg);
    padding: 0 var(--space-lg);
    position: relative;
    flex-shrink: 0;
  }

  /* Footer sections */
  .footer-section {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .footer-buttons {
    gap: 10px;
  }

  .footer-divider {
    width: 1px;
    height: 20px;
    background-color: var(--color-border);
    opacity: 0.5;
  }

  /* Stats in footer */
  .footer-stats {
    font-size: 13px;
    display: flex;
    gap: 15px;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .stat-label {
    color: var(--color-text-muted);
  }

  .stat-value {
    font-weight: 600;
    color: var(--color-text);
  }

  .stat-value.negative {
    color: #f44336;
  }

  /* Buttons */
  #edit-prompt-btn,
  #process-text-btn {
    padding: var(--space-xs) var(--space-sm);
    font-size: 14px;
    border: 1px solid var(--color-border);
    background-color: var(--color-paper-light);
    cursor: pointer;
    border-radius: 0;
    opacity: 0.5;
    transition: opacity 0.2s ease;
  }

  #edit-prompt-btn:hover,
  #process-text-btn:hover {
    opacity: 1;
  }

  #process-text-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    #editor {
      padding: 10px;
      font-size: 14px;
    }
    
    #llm-output {
      max-height: 25vh;
      font-size: 0.8em;
    }
    
    .footer {
      gap: 10px;
      padding: 0 10px;
      flex-wrap: wrap;
    }
    
    .footer-divider {
      display: none;
    }
    
    .footer-section {
      gap: 8px;
    }
    
    .footer-stats {
      font-size: 12px;
      gap: 10px;
    }
    
    .stat-label {
      display: none;
    }
    
    .stat-value {
      position: relative;
    }
    
    /* Mobile stat prefixes */
    .stat-value::before {
      color: var(--color-text-muted);
      font-weight: normal;
    }
    
    .stat-item:nth-child(1) .stat-value::before { content: "W: "; }
    .stat-item:nth-child(2) .stat-value::before { content: "C: "; }
    .stat-item:nth-child(3) .stat-value::before { content: "RT: "; }
    .stat-item:nth-child(4) .stat-value::before { content: "S: "; }
    
    #edit-prompt-btn,
    #process-text-btn {
      font-size: 0.9em;
    }
  }
</style>