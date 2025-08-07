<script lang="ts">
  import { getCaretPosition, extractPlainText } from '$lib/utils/editor';
  
  interface Props {
    content: string;
    fontFamily: string;
    fontSize: string;
    onContentChange: (newContent: string) => void;
    onParagraphComplete?: () => void; // For analysis triggers
    onScroll?: () => void; // For feedback marker updates
  }
  
  let { 
    content, 
    fontFamily, 
    fontSize, 
    onContentChange, 
    onParagraphComplete,
    onScroll
  }: Props = $props();
  
  let editorElement: HTMLDivElement;
  let isUpdatingContent = false;
  
  // Export the editor element for parent components that need it
  export function getEditorElement(): HTMLDivElement {
    return editorElement;
  }
  
  // Update editor content when prop changes
  $effect(() => {
    if (editorElement && content !== editorElement.textContent && !isUpdatingContent) {
      isUpdatingContent = true;
      editorElement.textContent = content;
      isUpdatingContent = false;
    }
  });
  
  // Handle contenteditable input
  function handleInput() {
    if (isUpdatingContent) return;
    
    const plainText = extractPlainText(editorElement);
    onContentChange(plainText);
  }
  
  // Handle keydown for paragraph detection
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && onParagraphComplete) {
      const textBeforeCursor = content.slice(0, getCaretPosition(editorElement));
      
      // If the text before cursor ends with a newline, this is a double enter (new paragraph)
      if (textBeforeCursor.endsWith('\n')) {
        // Small delay to let the enter key register
        setTimeout(() => onParagraphComplete?.(), 100);
      }
    }
  }
  
  // Handle editor scroll
  function handleEditorScroll() {
    onScroll?.();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  bind:this={editorElement}
  contenteditable="true"
  class="rich-editor"
  style="font-family: {fontFamily}; font-size: {fontSize};"
  oninput={handleInput}
  onkeydown={handleKeydown}
  onscroll={handleEditorScroll}
></div>

<style>
  .rich-editor {
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
  
  /* Mobile responsive */
  @media (max-width: 768px) {
    .rich-editor {
      padding: 10px;
      font-size: 14px;
    }
  }
</style>