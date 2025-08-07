<script lang="ts">
  interface Props {
    wordCount: number;
    charCount: number;
    readingTime: number;
    sessionWords: number;
    processing: boolean;
    onProcessText: () => void;
    onEditPrompt: () => void;
  }
  
  let { 
    wordCount, 
    charCount, 
    readingTime, 
    sessionWords, 
    processing, 
    onProcessText, 
    onEditPrompt 
  }: Props = $props();
</script>

<div class="footer" id="editor-footer">
  <div class="footer-section footer-buttons">
    <button id="edit-prompt-btn" onclick={onEditPrompt}>Edit Prompt</button>
    <button id="process-text-btn" onclick={onProcessText} disabled={processing}>
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

<style>
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