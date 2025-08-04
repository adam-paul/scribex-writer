import { writable } from 'svelte/store';

interface UIState {
  showProjectModal: boolean;
  showPromptModal: boolean;
}

function createUIStore() {
  const { subscribe, update } = writable<UIState>({
    showProjectModal: false,
    showPromptModal: false
  });

  return {
    subscribe,
    
    openProjectModal() {
      update(state => ({ ...state, showProjectModal: true }));
    },
    
    closeProjectModal() {
      update(state => ({ ...state, showProjectModal: false }));
    },
    
    openPromptModal() {
      update(state => ({ ...state, showPromptModal: true }));
    },
    
    closePromptModal() {
      update(state => ({ ...state, showPromptModal: false }));
    },
    
    toggleProjectModal() {
      update(state => ({ ...state, showProjectModal: !state.showProjectModal }));
    },
    
    togglePromptModal() {
      update(state => ({ ...state, showPromptModal: !state.showPromptModal }));
    }
  };
}

export const uiStore = createUIStore();