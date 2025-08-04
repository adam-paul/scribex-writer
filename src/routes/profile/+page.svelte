<script lang="ts">
  import { preferences } from '$lib/stores/preferences';
  
  let fontFamily = $state($preferences.fontFamily);
  let fontSize = $state($preferences.fontSize);
  
  $effect(() => {
    preferences.setFontFamily(fontFamily);
  });
  
  $effect(() => {
    preferences.setFontSize(fontSize);
  });
</script>

<div class="profile-container">
  <h2>My Profile</h2>
  <div class="profile-settings">
    <h3>Writing Preferences</h3>
    <div class="preference-group">
      <label for="font-selector">Font Family:</label>
      <select id="font-selector" bind:value={fontFamily}>
        <option value="'Courier New', monospace">Courier</option>
        <option value="Arial, sans-serif">Arial</option>
        <option value="Georgia, serif">Georgia</option>
      </select>
    </div>
    <div class="preference-group">
      <label for="size-selector">Font Size:</label>
      <select id="size-selector" bind:value={fontSize}>
        <option value="12px">12px</option>
        <option value="16px">16px</option>
        <option value="20px">20px</option>
      </select>
    </div>
  </div>
  <div class="profile-stats">
    <h3>Writing Statistics</h3>
    <p>Your writing journey visualizations will appear here.</p>
  </div>
</div>

<style>
  .profile-container {
    padding: var(--space-lg);
    max-width: 800px;
    margin: 0 auto;
  }

  .profile-container h2 {
    margin-bottom: 2rem;
    font-size: 2rem;
    color: var(--color-text);
  }

  .profile-settings,
  .profile-stats {
    background-color: rgba(255, 255, 255, 0.8);
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: var(--space-lg);
    margin-bottom: var(--space-lg);
  }

  .profile-settings h3,
  .profile-stats h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.25rem;
    color: var(--color-text);
  }

  .preference-group {
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .preference-group label {
    min-width: 100px;
    font-weight: 500;
  }

  .preference-group select {
    padding: var(--space-xs) var(--space-sm);
    font-size: 14px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background-color: white;
    cursor: pointer;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .profile-container {
      padding: var(--space-md);
    }

    .profile-container h2 {
      font-size: 1.5rem;
    }

    .preference-group {
      flex-direction: column;
      align-items: flex-start;
    }

    .preference-group label {
      min-width: auto;
    }

    .preference-group select {
      width: 100%;
    }
  }
</style>