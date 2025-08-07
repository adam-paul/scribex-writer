<script lang="ts">
  interface Props {
    isOpen: boolean;
    feedbackCount: number;
    onToggle: () => void;
  }
  
  let { isOpen, feedbackCount, onToggle }: Props = $props();
</script>

<button 
  class="sidebar-toggle-btn"
  onclick={onToggle}
  aria-label={isOpen ? 'Close feedback sidebar' : 'Open feedback sidebar'}
  title={isOpen ? 'Close feedback' : `Show feedback (${feedbackCount} items)`}
>
  {#if !isOpen && feedbackCount > 0}
    <span class="feedback-badge">{feedbackCount}</span>
  {/if}
  {#if isOpen}
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M9.5 3.5L14 8l-4.5 4.5L8 11l3-3-3-3z"/>
    </svg>
  {:else}
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M6.5 12.5L2 8l4.5-4.5L8 5l-3 3 3 3z"/>
    </svg>
  {/if}
</button>

<style>
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
</style>