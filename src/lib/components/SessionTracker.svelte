<script lang="ts">
  import { onMount } from 'svelte';
  import { sessions } from '$lib/stores/sessions';
  
  interface Props {
    currentWordCount: number;
    projectId?: string;
  }
  
  let { currentWordCount, projectId }: Props = $props();
  
  let sessionStartWords = $state(0);
  let sessionStartTime = $state(Date.now());
  
  // Calculate session words
  const sessionWords = $derived(currentWordCount - sessionStartWords);
  
  // Export function to get session words
  export function getSessionWords(): number {
    return sessionWords;
  }
  
  // Initialize session when project changes
  $effect(() => {
    if (projectId) {
      sessionStartWords = currentWordCount;
      sessionStartTime = Date.now();
    }
  });
  
  onMount(() => {
    sessions.init();
    
    // Initialize session tracking
    sessionStartWords = currentWordCount;
    sessionStartTime = Date.now();
    
    // Record session on page unload
    const recordAndCleanup = () => {
      if (projectId && sessionWords > 0) {
        const duration = Date.now() - sessionStartTime;
        sessions.recordSession(sessionWords, duration, projectId);
      }
    };
    
    // Save session before page unload
    window.addEventListener('beforeunload', recordAndCleanup);
    
    // Save when switching tabs/windows
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordAndCleanup();
      } else {
        // Reset session start when returning
        sessionStartWords = currentWordCount;
        sessionStartTime = Date.now();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', recordAndCleanup);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  });
</script>

<!-- No template - this is a logic-only component -->