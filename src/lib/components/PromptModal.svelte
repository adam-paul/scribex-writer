<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Modal from './Modal.svelte';
  import { StorageService } from '$lib/services/storage';
  import { uiStore } from '$lib/stores/ui';
  
  interface Props {
    showModal?: boolean;
  }
  
  let { showModal = false }: Props = $props();
  
  let promptText = $state('');
  let defaultPrompt = $state('');
  let defaultPromptLoaded = $state(false);
  let textareaElement = $state<HTMLTextAreaElement>();
  
  // Load default prompt on mount
  onMount(async () => {
    try {
      const response = await fetch('/prompts/overall-critique.md');
      if (response.ok) {
        defaultPrompt = await response.text().then(text => text.trim());
        defaultPromptLoaded = true;
      }
    } catch (error) {
      console.error('Failed to load default prompt:', error);
    }
  });
  
  // Load current prompt when modal opens
  $effect(() => {
    if (showModal) {
      promptText = StorageService.getCustomPrompt() || defaultPrompt || '';
      // Focus textarea after DOM updates
      tick().then(() => {
        textareaElement?.focus();
      });
    }
  });
  
  function savePrompt() {
    const trimmedPrompt = promptText.trim();
    if (trimmedPrompt) {
      StorageService.setCustomPrompt(trimmedPrompt);
      uiStore.closePromptModal();
      alert('Prompt saved successfully!');
    } else {
      alert('Please enter a prompt before saving.');
    }
  }
  
  function resetToDefault() {
    if (!defaultPromptLoaded || !defaultPrompt) {
      alert('Error: Default prompt not loaded. Cannot reset.');
      return;
    }
    
    if (confirm('Are you sure you want to reset to the default prompt?')) {
      promptText = defaultPrompt;
      StorageService.setCustomPrompt(defaultPrompt);
      alert('Prompt reset to default.');
    }
  }
</script>

<Modal showModal={showModal} title="Edit Writing Mentor Prompt" onclose={() => uiStore.closePromptModal()}>
  <p>Customize the system prompt that guides the AI's feedback on your writing:</p>
  
  <textarea 
    id="prompt-textarea"
    bind:this={textareaElement}
    bind:value={promptText}
    placeholder="Enter your custom system prompt here..."
    rows="10"
  ></textarea>
  
  <div class="modal-buttons">
    <button 
      id="reset-prompt-btn"
      onclick={resetToDefault}
      disabled={!defaultPromptLoaded}
    >
      Reset to Default
    </button>
    <button 
      id="save-prompt-btn"
      class="primary-btn"
      onclick={savePrompt}
    >
      Save Prompt
    </button>
  </div>
</Modal>

<style>
  textarea {
    width: 100%;
    min-height: 200px;
    margin: 1rem 0;
    padding: 1rem;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
    font-family: inherit;
    font-size: 14px;
    resize: vertical;
  }
  
  .modal-buttons {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }

  .primary-btn {
    background-color: var(--color-primary);
    color: white;
    border: none;
    padding: 10px var(--space-lg);
    font-size: 16px;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .primary-btn:hover {
    background-color: #45a049;
  }
</style>