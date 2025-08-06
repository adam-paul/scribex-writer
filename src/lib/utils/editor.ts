export function getCaretPosition(element: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;
  
  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  
  return preCaretRange.toString().length;
}

export function setCaretPosition(element: HTMLElement, position: number) {
  const selection = window.getSelection();
  const range = document.createRange();
  
  let currentPos = 0;
  let foundNode = false;
  
  function traverse(node: Node) {
    if (foundNode) return;
    
    if (node.nodeType === Node.TEXT_NODE) {
      const textLength = node.textContent?.length || 0;
      if (currentPos + textLength >= position) {
        range.setStart(node, position - currentPos);
        range.setEnd(node, position - currentPos);
        foundNode = true;
      } else {
        currentPos += textLength;
      }
    } else {
      for (const child of node.childNodes) {
        traverse(child);
        if (foundNode) break;
      }
    }
  }
  
  traverse(element);
  
  if (foundNode) {
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}

export function extractPlainText(element: HTMLElement): string {
  // Replace <br> and <div> with newlines
  const clone = element.cloneNode(true) as HTMLElement;
  
  clone.querySelectorAll('br').forEach(br => {
    br.replaceWith('\n');
  });
  
  clone.querySelectorAll('div').forEach(div => {
    if (div.previousSibling) {
      div.before('\n');
    }
  });
  
  return clone.textContent || '';
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}