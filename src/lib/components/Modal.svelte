<script lang="ts">
  import { tick } from 'svelte';
  
  interface Props {
    showModal: boolean;
    title: string;
    onclose: () => void;
    children?: any;
  }
  
  let { showModal, title, onclose, children }: Props = $props();
  
  let modalElement = $state<HTMLDivElement>();
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onclose();
    }
  }
  
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onclose();
    }
  }
  
  $effect(() => {
    if (showModal && modalElement) {
      tick().then(() => {
        modalElement?.focus();
      });
    }
  });
</script>

{#if showModal}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    bind:this={modalElement}
    class="modal" 
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    tabindex="-1"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3>{title}</h3>
        <button 
          class="close" 
          onclick={onclose}
        >
          &times;
        </button>
      </div>
      <div class="modal-body">
        {@render children?.()}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    z-index: 2000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgba(0,0,0,0.5);
  }

  .modal-content {
    background-color: var(--color-paper-light);
    padding: var(--space-lg);
    border: 1px solid var(--color-border);
    width: 80%;
    max-width: 800px;
    max-height: 80vh;
    overflow-y: auto;
    box-sizing: border-box;
    border-radius: 4px;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
  }

  .close {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
    line-height: 1;
    background: none;
    border: none;
    padding: 0;
    opacity: 1;
  }

  .close:hover,
  .close:focus {
    color: black;
    text-decoration: none;
  }

  .modal-body {
    width: 100%;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .modal-content {
      margin: 2% auto;
      width: 95%;
      max-height: 90vh;
      padding: 15px;
    }
  }
</style>