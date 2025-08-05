<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projects';
  import { StorageService } from '$lib/services/storage';
  import { preferences } from '$lib/stores/preferences';
  import { sessions } from '$lib/stores/sessions';
  import PromptModal from '$lib/components/PromptModal.svelte';
  import FeedbackSidebar from '$lib/components/FeedbackSidebar.svelte';
  import type { InlineFeedback } from '$lib/models/Project';
  import { getCaretPosition, setCaretPosition, extractPlainText, escapeHtml } from '$lib/utils/editor';
  
  const currentProject = projectStore.currentProject;
  
  // Re-render markers when feedback changes
  $effect(() => {
    if ($currentProject?.inlineFeedback) {
      // Update markers in overlay
      if (editorElement && overlayElement) {
        updateFeedbackMarkers();
      }
    }
  });
  
  let editorContent = $state('');
  let processing = $state(false);
  let saveTimer = $state<number>();
  let showPromptModal = $state(false);
  
  // Editor element reference
  let editorElement: HTMLDivElement;
  let overlayElement: HTMLDivElement;
  let isUpdatingContent = false;
  let showSidebar = $state(false);
  let selectedFeedbackId = $state<string | null>(null);
  
  // Inline analysis state
  let analysisTimer: number | null = null;
  
  // Track current project ID to detect actual project changes
  let currentProjectId = $state<string | null>(null);
  let lastSavedContent = $state('');
  
  // Load content and reset session when project changes
  $effect(() => {
    if ($currentProject && $currentProject.id !== currentProjectId) {
      currentProjectId = $currentProject.id;
      editorContent = $currentProject.content;
      lastSavedContent = $currentProject.content; // Update last saved content too
      sessionStartWords = $currentProject.wordCount || 0;
      sessionStartTime = Date.now();
      
      // Update editor content if it exists
      if (editorElement) {
        editorElement.textContent = editorContent;
        updateFeedbackMarkers();
      }
    }
  });
  
  // Auto-save on content change
  $effect(() => {
    if ($currentProject && editorContent !== lastSavedContent) {
      projectStore.saveStatus.set('unsaved');
      clearTimeout(saveTimer);
      lastSavedContent = editorContent;
      saveTimer = window.setTimeout(() => {
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
  
  // Handle contenteditable input
  function handleInput() {
    if (isUpdatingContent) return;
    
    const plainText = extractPlainText(editorElement);
    editorContent = plainText;
    
    // Update markers after text change
    requestAnimationFrame(() => {
      updateFeedbackMarkers();
    });
  }
  
  // Update feedback markers in overlay
  function updateFeedbackMarkers() {
    if (!editorElement || !overlayElement) return;
    
    const feedback = $currentProject?.inlineFeedback || [];
    const activeFeedback = feedback.filter(f => !f.dismissed);
    
    // Clear existing markers
    overlayElement.innerHTML = '';
    
    // Sort feedback by position
    const sortedFeedback = [...activeFeedback].sort((a, b) => a.endIndex - b.endIndex);
    
    for (const item of sortedFeedback) {
      const markerPosition = getTextPositionInEditor(item.endIndex);
      if (markerPosition) {
        const marker = document.createElement('div');
        marker.className = `feedback-marker ${item.type}`;
        marker.dataset.feedbackId = item.id;
        marker.style.position = 'absolute';
        marker.style.left = `${markerPosition.x}px`;
        marker.style.top = `${markerPosition.y - 12}px`; // Position above text
        marker.innerHTML = '<span class="feedback-dot pulse"></span>';
        marker.onclick = () => handleMarkerClick(item.id);
        overlayElement.appendChild(marker);
      }
    }
  }
  
  // Get position of text index in editor
  function getTextPositionInEditor(index: number): { x: number, y: number } | null {
    if (!editorElement) return null;
    
    const text = editorElement.textContent || '';
    if (index > text.length) return null;
    
    const range = document.createRange();
    const textNode = getTextNodeAtIndex(editorElement, index);
    
    if (!textNode.node) return null;
    
    try {
      range.setStart(textNode.node, Math.min(textNode.offset, textNode.node.textContent?.length || 0));
      range.setEnd(textNode.node, Math.min(textNode.offset, textNode.node.textContent?.length || 0));
      
      const rect = range.getBoundingClientRect();
      const editorRect = editorElement.getBoundingClientRect();
      
      return {
        x: rect.left - editorRect.left + editorElement.scrollLeft,
        y: rect.top - editorRect.top + editorElement.scrollTop
      };
    } catch (e) {
      console.error('Error getting text position:', e);
      return null;
    }
  }
  
  // Helper to find text node at index
  function getTextNodeAtIndex(element: Node, targetIndex: number): { node: Node, offset: number } {
    let currentIndex = 0;
    let result = { node: element, offset: 0 };
    
    function traverse(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const length = node.textContent?.length || 0;
        if (currentIndex + length >= targetIndex) {
          result = { node, offset: targetIndex - currentIndex };
          return true;
        }
        currentIndex += length;
      } else {
        for (const child of node.childNodes) {
          if (traverse(child)) return true;
        }
      }
      return false;
    }
    
    traverse(element);
    return result;
  }
  
  // Handle clicks on feedback markers
  function handleMarkerClick(feedbackId: string) {
    selectedFeedbackId = feedbackId;
    showSidebar = true;
  }
  
  // Handle keydown for paragraph detection
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
      
      if (range) {
        const textBeforeCursor = editorContent.slice(0, getCaretPosition(editorElement));
        
        // If the text before cursor ends with a newline, this is a double enter (new paragraph)
        if (textBeforeCursor.endsWith('\n')) {
          // Cancel any pending analysis and run immediately
          if (analysisTimer) clearTimeout(analysisTimer);
          // Small delay to let the enter key register
          setTimeout(() => analyzeNewContent(), 100);
        }
      }
    }
  }
  
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
    
    // Initialize editor content
    if (editorElement && editorContent) {
      editorElement.textContent = editorContent;
      updateFeedbackMarkers();
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
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          bind:this={editorElement}
          contenteditable="true"
          id="editor" 
          class="rich-editor"
          style="font-family: {$preferences.fontFamily}; font-size: {$preferences.fontSize};"
          oninput={handleInput}
          onkeydown={handleKeydown}
        ></div>
        
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
      <button 
        class="sidebar-toggle-btn"
        onclick={() => showSidebar = !showSidebar}
        aria-label={showSidebar ? 'Close feedback sidebar' : 'Open feedback sidebar'}
        title={showSidebar ? 'Close feedback' : `Show feedback (${feedbackCount} items)`}
      >
        {#if !showSidebar && feedbackCount > 0}
          <span class="feedback-badge">{feedbackCount}</span>
        {/if}
        {#if showSidebar}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9.5 3.5L14 8l-4.5 4.5L8 11l3-3-3-3z"/>
          </svg>
        {:else}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.5 12.5L2 8l4.5-4.5L8 5l-3 3 3 3z"/>
          </svg>
        {/if}
      </button>
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

  <div class="footer" id="editor-footer">
  <div class="footer-section footer-buttons">
    <button id="edit-prompt-btn" onclick={() => showPromptModal = true}>Edit Prompt</button>
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
    right: 0;
    bottom: 0;
    pointer-events: none;
    overflow: hidden;
  }
  
  .feedback-overlay :global(.feedback-marker) {
    pointer-events: auto;
  }

  #editor, .rich-editor {
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
    white-space: pre-wrap;
    word-wrap: break-word;
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
  
  /* Sidebar toggle button - always visible */
  .sidebar-toggle-btn {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 24px;
    height: 48px;
    background: var(--color-paper-accent);
    border: 1px solid var(--color-border);
    border-right: none;
    border-radius: 8px 0 0 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
    z-index: 101;
    transition: all 0.2s ease;
    opacity: 0.7;
  }
  
  .sidebar-toggle-btn:hover {
    background: var(--color-bg-hover, #e0e0e0);
    opacity: 1;
    width: 28px;
  }
  
  .sidebar-toggle-btn svg {
    transition: transform 0.2s ease;
  }
  
  .sidebar-toggle-btn:hover svg {
    transform: scale(1.1);
  }
  
  /* Feedback count badge */
  .feedback-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    background: var(--color-error, #ff6b6b);
    color: white;
    font-size: 10px;
    font-weight: bold;
    padding: 2px 5px;
    border-radius: 10px;
    min-width: 16px;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
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

<!-- Modals -->
<PromptModal showModal={showPromptModal} onclose={() => showPromptModal = false} />