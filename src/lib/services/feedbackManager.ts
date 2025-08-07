import type { InlineFeedback } from '$lib/models/Project';

export interface FeedbackPosition {
  x: number;
  y: number;
  feedbackId: string;
}

export interface FeedbackManagerOptions {
  editorElement: HTMLElement;
  overlayElement: HTMLElement;
}

export class FeedbackManager {
  private editorElement: HTMLElement;
  private overlayElement: HTMLElement;
  private clickCallback?: (feedbackId: string) => void;
  
  constructor({ editorElement, overlayElement }: FeedbackManagerOptions) {
    this.editorElement = editorElement;
    this.overlayElement = overlayElement;
  }
  
  updateMarkers(feedback: InlineFeedback[]): void {
    if (!this.editorElement || !this.overlayElement) return;
    
    const activeFeedback = feedback.filter(f => !f.dismissed);
    
    // Clear existing markers
    this.overlayElement.innerHTML = '';
    
    // Sort feedback by position
    const sortedFeedback = [...activeFeedback].sort((a, b) => a.endIndex - b.endIndex);
    
    for (const item of sortedFeedback) {
      const markerPosition = this.getTextPositionInEditor(item.endIndex);
      if (markerPosition) {
        const marker = document.createElement('div');
        marker.className = `feedback-marker ${item.type}`;
        marker.dataset.feedbackId = item.id;
        marker.style.position = 'absolute';
        marker.style.left = `${markerPosition.x}px`;
        marker.style.top = `${markerPosition.y - 12}px`; // Position above text
        marker.innerHTML = '<span class="feedback-dot pulse"></span>';
        marker.onclick = () => this.handleMarkerClick(item.id);
        this.overlayElement.appendChild(marker);
      }
    }
  }
  
  private getTextPositionInEditor(index: number): { x: number, y: number } | null {
    if (!this.editorElement) return null;
    
    const text = this.editorElement.textContent || '';
    if (index > text.length) return null;
    
    const range = document.createRange();
    const textNode = this.getTextNodeAtIndex(this.editorElement, index);
    
    if (!textNode.node) return null;
    
    try {
      range.setStart(textNode.node, Math.min(textNode.offset, textNode.node.textContent?.length || 0));
      range.setEnd(textNode.node, Math.min(textNode.offset, textNode.node.textContent?.length || 0));
      
      const rect = range.getBoundingClientRect();
      const editorRect = this.editorElement.getBoundingClientRect();
      
      return {
        x: rect.left - editorRect.left + this.editorElement.scrollLeft,
        y: rect.top - editorRect.top + this.editorElement.scrollTop
      };
    } catch (e) {
      console.error('Error getting text position:', e);
      return null;
    }
  }
  
  private getTextNodeAtIndex(element: Node, targetIndex: number): { node: Node, offset: number } {
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
  
  private handleMarkerClick(feedbackId: string): void {
    if (this.clickCallback) {
      this.clickCallback(feedbackId);
    }
  }
  
  onMarkerClick(callback: (feedbackId: string) => void): void {
    this.clickCallback = callback;
  }
}