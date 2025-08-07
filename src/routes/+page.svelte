<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projects';
  import { StorageService } from '$lib/services/storage';
  import { preferences } from '$lib/stores/preferences';
  import PromptModal from '$lib/components/PromptModal.svelte';
  import FeedbackSidebar from '$lib/components/FeedbackSidebar.svelte';
  import EditorFooter from '$lib/components/EditorFooter.svelte';
  import SidebarToggle from '$lib/components/SidebarToggle.svelte';
  import SessionTracker from '$lib/components/SessionTracker.svelte';
  import EditorCore from '$lib/components/EditorCore.svelte';
  import type { InlineFeedback } from '$lib/models/Project';
  import { getCaretPosition, setCaretPosition, extractPlainText, escapeHtml } from '$lib/utils/editor';
  import { FeedbackManager } from '$lib/services/feedbackManager';
  
  const currentProject = projectStore.currentProject;
  
  // Initialize feedback manager when elements are ready
  $effect(() => {
    if (editorCore && overlayElement && !feedbackManager) {
      const editorElement = editorCore.getEditorElement();
      if (editorElement) {
        feedbackManager = new FeedbackManager({
          editorElement,
          overlayElement
        });
        feedbackManager.onMarkerClick((feedbackId) => {
          selectedFeedbackId = feedbackId;
          showSidebar = true;
        });
      }
    }
  });

  // Re-render markers when feedback changes
  $effect(() => {
    if ($currentProject?.inlineFeedback && feedbackManager) {
      feedbackManager.updateMarkers($currentProject.inlineFeedback);
    }
  });
  
  // Re-render markers when sidebar toggles
  $effect(() => {
    showSidebar; // Track sidebar state
    // Update markers after sidebar animation completes
    if (feedbackManager && $currentProject?.inlineFeedback) {
      setTimeout(() => {
        feedbackManager?.updateMarkers($currentProject.inlineFeedback!);
      }, 350); // Match sidebar transition duration
    }
  });
  
  let editorContent = $state('');
  let processing = $state(false);
  let saveTimer = $state<ReturnType<typeof setTimeout>>();
  let showPromptModal = $state(false);
  
  // Overlay element reference
  let overlayElement: HTMLDivElement;
  let showSidebar = $state(false);
  let selectedFeedbackId = $state<string | null>(null);
  let resizeObserver: ResizeObserver | null = null;
  let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let feedbackManager: FeedbackManager | null = null;
  let sessionTracker: SessionTracker | undefined;
  let editorCore: EditorCore;
  
  // Inline analysis state
  let analysisTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Track current project ID to detect actual project changes
  let currentProjectId = $state<string | null>(null);
  let lastSavedContent = $state('');
  
  // Initialize content on first load and handle project changes
  $effect(() => {
    if ($currentProject) {
      // Handle initial load or project change
      if ($currentProject.id !== currentProjectId) {
        currentProjectId = $currentProject.id;
        editorContent = $currentProject.content || '';
        lastSavedContent = $currentProject.content || '';
        
        // Update feedback markers
        if (feedbackManager && $currentProject?.inlineFeedback) {
          feedbackManager.updateMarkers($currentProject.inlineFeedback);
        }
      }
    } else {
      // No current project - clear content
      currentProjectId = null;
      editorContent = '';
      lastSavedContent = '';
    }
  });
  
  // Auto-save on content change
  $effect(() => {
    if ($currentProject && editorContent !== lastSavedContent) {
      projectStore.saveStatus.set('unsaved');
      clearTimeout(saveTimer);
      lastSavedContent = editorContent;
      saveTimer = setTimeout(() => {
        projectStore.updateContent($currentProject.id, editorContent);
      }, 2000);
    }
  });
  
  // Word counting - reactive statements
  const wordCount = $derived(editorContent.trim().split(/\s+/).filter(w => w.length > 0).length || 0);
  const charCount = $derived(editorContent.length);
  const readingTime = $derived(Math.ceil(wordCount / 200));
  
  // Inline analysis trigger
  $effect(() => {
    if (editorContent && $currentProject) {
      scheduleAnalysis();
    }
  });
  
  function scheduleAnalysis() {
    if (analysisTimer) clearTimeout(analysisTimer);
    
    analysisTimer = setTimeout(() => {
      analyzeNewContent();
    }, 5000);
  }
  
  async function analyzeNewContent() {
    if (!$currentProject) return;
    
    const currentAnalyzedPosition = $currentProject.lastAnalyzedPosition || 0;
    const newContent = editorContent.slice(currentAnalyzedPosition);
    
    // Extract only complete sentences
    const sentences = extractCompleteSentences(newContent);
    if (sentences.length === 0) return; // No complete sentences to analyze
    
    // Find the actual end position of the last complete sentence in the original text
    const lastSentence = sentences[sentences.length - 1];
    const lastSentenceEndInNewContent = newContent.lastIndexOf(lastSentence) + lastSentence.length;
    const textToAnalyze = newContent.slice(0, lastSentenceEndInNewContent).trim();
    const lastSentenceEnd = currentAnalyzedPosition + lastSentenceEndInNewContent;
    
    try {
      const response = await fetch('/api/analyze-inline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          textSegment: textToAnalyze,
          startPosition: currentAnalyzedPosition 
        })
      });
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }
      
      const result = await response.json();
      const { feedback } = result;
      
      // Store feedback and update position
      if (feedback && feedback.length > 0) {
        projectStore.addInlineFeedback($currentProject.id, feedback);
      }
      
      // Always update position to prevent re-analyzing the same content
      projectStore.updateAnalyzedPosition($currentProject.id, lastSentenceEnd);
      
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  }
  
  function extractCompleteSentences(text: string): string[] {
    // Match sentences ending with . ! ? followed by space or end of string
    const sentenceRegex = /[^.!?]+[.!?]+(?:\s+|$)/g;
    const matches = text.match(sentenceRegex) || [];
    
    // Filter to ensure last sentence is complete (not mid-typing)
    return matches.filter((sentence, index) => {
      if (index === matches.length - 1) {
        // Last sentence must end with punctuation and have space after or be at end
        const trimmed = sentence.trim();
        return /[.!?]$/.test(trimmed) && 
               (text.endsWith(sentence) || /[.!?]\s+$/.test(sentence));
      }
      return true;
    }).map(s => s.trim());
  }
  
  // Handle content change from EditorCore
  function handleContentChange(newContent: string) {
    editorContent = newContent;
    
    // Update markers after text change
    requestAnimationFrame(() => {
      if (feedbackManager && $currentProject?.inlineFeedback) {
        feedbackManager.updateMarkers($currentProject.inlineFeedback);
      }
    });
  }
  
  // Handle paragraph completion from EditorCore
  function handleParagraphComplete() {
    // Cancel any pending analysis and run immediately
    if (analysisTimer) clearTimeout(analysisTimer);
    setTimeout(() => analyzeNewContent(), 100);
  }
  
  // Handle scroll from EditorCore
  function handleEditorScroll() {
    // Update marker positions on scroll
    requestAnimationFrame(() => {
      if (feedbackManager && $currentProject?.inlineFeedback) {
        feedbackManager.updateMarkers($currentProject.inlineFeedback);
      }
    });
  }
  
  // Get session words from SessionTracker component
  const sessionWords = $derived(sessionTracker?.getSessionWords() || 0);
  
  // Initialize on mount
  onMount(() => {
    // Set up ResizeObserver to watch for editor dimension changes
    if (editorCore) {
      const editorElement = editorCore.getEditorElement();
      if (editorElement) {
        resizeObserver = new ResizeObserver(() => {
          // Debounce resize updates
          if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
          resizeDebounceTimer = setTimeout(() => {
            if (feedbackManager && $currentProject?.inlineFeedback) {
              feedbackManager.updateMarkers($currentProject.inlineFeedback);
            }
          }, 100);
        });
        resizeObserver.observe(editorElement);
      }
    }
    
    // Also watch for window resize
    const handleWindowResize = () => {
      if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = setTimeout(() => {
        if (feedbackManager && $currentProject?.inlineFeedback) {
          feedbackManager.updateMarkers($currentProject.inlineFeedback);
        }
      }, 100);
    };
    window.addEventListener('resize', handleWindowResize);
    
    return () => {
      window.removeEventListener('resize', handleWindowResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (resizeDebounceTimer) {
        clearTimeout(resizeDebounceTimer);
      }
    };
  });
  
  // Show AI response if it exists
  const showAIResponse = $derived(!!$currentProject?.aiResponse);
  const aiResponse = $derived($currentProject?.aiResponse || '');
  
  // Load default prompt on mount if needed
  onMount(async () => {
    // Only fetch if user hasn't saved a custom prompt
    if (!StorageService.getCustomPrompt()) {
      try {
        const response = await fetch('/prompts/overall-critique.md');
        if (response.ok) {
          const defaultPrompt = await response.text();
          StorageService.setCustomPrompt(defaultPrompt.trim());
        }
      } catch (error) {
        console.error('Failed to load default prompt:', error);
      }
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
  <div class="main-content">
    <div class="editor-wrapper">
      <div class="editor-content">
        <EditorCore
          bind:this={editorCore}
          content={editorContent}
          fontFamily={$preferences.fontFamily}
          fontSize={$preferences.fontSize}
          onContentChange={handleContentChange}
          onParagraphComplete={handleParagraphComplete}
          onScroll={handleEditorScroll}
        />
        
        <!-- Overlay for feedback markers -->
        <div 
          bind:this={overlayElement}
          class="feedback-overlay"
          aria-hidden="true"
        ></div>
        
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
    </div>
    
    <!-- Sidebar Toggle Button (always visible) -->
    {#if $currentProject}
      {@const feedbackCount = ($currentProject.inlineFeedback || []).filter(f => !f.dismissed).length}
      <SidebarToggle 
        isOpen={showSidebar}
        {feedbackCount}
        onToggle={() => showSidebar = !showSidebar}
      />
    {/if}
    
    <!-- Sidebar -->
    {#if $currentProject}
      <div class="sidebar-container" class:open={showSidebar}>
        <FeedbackSidebar 
          feedback={$currentProject.inlineFeedback || []} 
          isOpen={showSidebar}
          {selectedFeedbackId}
        />
      </div>
    {/if}
  </div>

  <EditorFooter 
    {wordCount}
    {charCount}
    {readingTime}
    {sessionWords}
    {processing}
    onProcessText={processText}
    onEditPrompt={() => showPromptModal = true}
  />
</div>

<!-- Logic-only components -->
<SessionTracker 
  bind:this={sessionTracker}
  currentWordCount={wordCount} 
  projectId={$currentProject?.id} 
/>

<style>
  .editor-container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  
  .editor-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  
  .editor-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: relative;
    overflow: hidden;
  }
  
  /* Feedback overlay */
  .feedback-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
    z-index: 1;
  }
  
  .feedback-overlay :global(.feedback-marker) {
    pointer-events: auto;
  }

  
  /* Feedback marker styles */
  :global(.feedback-marker) {
    cursor: pointer;
    z-index: 100;
  }
  
  :global(.feedback-dot) {
    display: block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s;
  }
  
  :global(.feedback-dot:hover) {
    transform: scale(1.5);
  }
  
  :global(.feedback-marker.grammar .feedback-dot) {
    background: var(--color-error, #ff6b6b);
  }
  
  :global(.feedback-marker.clarity .feedback-dot) {
    background: var(--color-warning, #ffd93d);
  }
  
  :global(.feedback-marker.flow .feedback-dot) {
    background: var(--color-info, #6bcf7f);
  }
  
  :global(.feedback-marker.tone .feedback-dot) {
    background: var(--color-secondary, #a29bfe);
  }
  
  :global(.feedback-marker.praise .feedback-dot) {
    background: var(--color-success, #4CAF50);
  }
  
  /* Pulsing animation */
  :global(.pulse) {
    animation: pulse 2s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 0.7;
      box-shadow: 0 0 0 0 currentColor;
    }
    50% {
      opacity: 1;
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0);
    }
  }
  
  /* Sidebar styles */
  .sidebar-container {
    position: relative;
    width: 0;
    transition: width 0.3s ease;
    background: var(--color-bg-secondary, #f5f5f5);
    border-left: 1px solid var(--color-border, #ddd);
    overflow: hidden;
  }
  
  .sidebar-container.open {
    width: 350px;
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


  /* Mobile responsive */
  @media (max-width: 768px) {
    #llm-output {
      max-height: 25vh;
      font-size: 0.8em;
    }
  }
</style>

<!-- Modals -->
<PromptModal showModal={showPromptModal} onclose={() => showPromptModal = false} />