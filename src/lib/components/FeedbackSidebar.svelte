<script lang="ts">
  import type { InlineFeedback } from '$lib/models/Project';
  
  interface Props {
    feedback: InlineFeedback[];
    isOpen?: boolean;
    selectedFeedbackId?: string | null;
  }
  
  let { feedback = [], isOpen = true, selectedFeedbackId = null }: Props = $props();
  
  // Group feedback by type for better organization
  const groupedFeedback = $derived(() => {
    const groups: Record<string, InlineFeedback[]> = {};
    
    feedback
      .filter(f => !f.dismissed)
      .forEach(f => {
        if (!groups[f.type]) {
          groups[f.type] = [];
        }
        groups[f.type].push(f);
      });
    
    return groups;
  });
  
  // Get icon for feedback type
  function getIcon(type: string): string {
    const icons: Record<string, string> = {
      grammar: '📝',
      clarity: '💭', 
      flow: '🔄',
      tone: '🎵',
      praise: '⭐'
    };
    return icons[type] || '💡';
  }
  
  // Get display name for feedback type
  function getTypeName(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
</script>

{#if isOpen}
  {#if feedback.length > 0}
    <div class="feedback-panel">
      <div class="feedback-header">
        <h3>Writing Feedback</h3>
        <span class="feedback-count">{feedback.filter(f => !f.dismissed).length} items</span>
      </div>
      
      <div class="feedback-content">
        {#if Object.keys(groupedFeedback()).length === 0}
          <p class="empty-state">All feedback has been dismissed.</p>
        {:else}
          {#each Object.entries(groupedFeedback()) as [type, items]}
            <div class="feedback-group">
              <h4 class="group-header">
                <span class="group-icon">{getIcon(type)}</span>
                {getTypeName(type)} ({items.length})
              </h4>
              {#each items as item}
                <div class="feedback-item {type}" class:selected={item.id === selectedFeedbackId}>
                  <p class="feedback-message">{item.message}</p>
                  <div class="feedback-meta">
                    <span class="position-info">Analyzed: chars {item.startIndex}-{item.endIndex}</span>
                  </div>
                </div>
              {/each}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
{/if}

<style>
  .feedback-panel {
    background: var(--color-paper-light);
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .feedback-header {
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--color-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--color-paper-accent);
  }
  
  .feedback-header h3 {
    margin: 0;
    font-size: 1.1em;
    font-weight: 600;
  }
  
  .feedback-count {
    font-size: 0.9em;
    color: var(--color-text-secondary);
  }
  
  .feedback-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-lg);
  }
  
  .empty-state {
    text-align: center;
    color: var(--color-text-secondary);
    font-style: italic;
  }
  
  .feedback-group {
    margin-bottom: var(--space-lg);
  }
  
  .feedback-group:last-child {
    margin-bottom: 0;
  }
  
  .group-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
    font-size: 0.95em;
    color: var(--color-text-secondary);
    font-weight: 500;
  }
  
  .group-icon {
    font-size: 1.2em;
  }
  
  .feedback-item {
    background: white;
    padding: var(--space-md);
    border-radius: 6px;
    margin-bottom: var(--space-sm);
    border: 1px solid var(--color-border);
    transition: all 0.2s ease;
  }
  
  .feedback-item:hover {
    border-color: var(--color-primary);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  .feedback-item.selected {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-light);
    background: var(--color-primary-bg);
  }
  
  .feedback-item.praise {
    background: var(--color-success-light);
    border-color: var(--color-success);
  }
  
  .feedback-message {
    margin: 0 0 var(--space-sm) 0;
    line-height: 1.5;
  }
  
  .feedback-meta {
    font-size: 0.85em;
    color: var(--color-text-secondary);
  }
  
  .position-info {
    font-family: monospace;
  }
</style>