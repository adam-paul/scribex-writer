// Default prompt - will be loaded from file
let DEFAULT_PROMPT = '';

// Load default prompt from file
fetch('static/prompts/default-prompt.txt')
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to load prompt: ${response.status} ${response.statusText}`);
    }
    return response.text();
  })
  .then(text => {
    DEFAULT_PROMPT = text.trim();
    // Initialize prompt textarea if modal is already in DOM
    const promptTextarea = document.getElementById('prompt-textarea');
    if (promptTextarea) {
      promptTextarea.value = loadPrompt();
    }
  })
  .catch(error => {
    console.error('Failed to load default prompt:', error);
    // Show error to user - do NOT use a fallback
    alert('Error: Failed to load default prompt file. Please check that static/prompts/default-prompt.txt exists.');
    // Disable the process button since we have no valid prompt
    const processButton = document.getElementById('process-text-btn');
    if (processButton) {
      processButton.disabled = true;
      processButton.title = 'Cannot process text - default prompt failed to load';
    }
  });

// Load saved prompt from localStorage or use default
function loadPrompt() {
  const savedPrompt = localStorage.getItem('scribex-prompt');
  return savedPrompt || DEFAULT_PROMPT;
}

// Save prompt to localStorage
function savePrompt(prompt) {
  localStorage.setItem('scribex-prompt', prompt);
}

// ========== PROJECT MANAGEMENT ==========
// Project structure
const projectSchema = {
  id: 'project_' + Date.now(),
  title: 'Untitled Project',
  content: '',
  created: new Date().toISOString(),
  lastModified: new Date().toISOString(),
  wordCount: 0,
  genre: 'general' // for future use
};

// Project management functions
function createProject(title = 'Untitled Project') {
  const project = {
    ...projectSchema,
    id: 'project_' + Date.now(),
    title: title,
    created: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };
  saveProject(project);
  return project;
}

function saveProject(project) {
  const projects = getAllProjects();
  const index = projects.findIndex(p => p.id === project.id);
  
  if (index > -1) {
    projects[index] = project;
  } else {
    projects.push(project);
  }
  
  localStorage.setItem('scribex-projects', JSON.stringify(projects));
  localStorage.setItem('scribex-current-project', project.id);
}

function getAllProjects() {
  const stored = localStorage.getItem('scribex-projects');
  return stored ? JSON.parse(stored) : [];
}

function getCurrentProject() {
  const currentId = localStorage.getItem('scribex-current-project');
  const projects = getAllProjects();
  let project = projects.find(p => p.id === currentId);
  
  if (!project && projects.length > 0) {
    project = projects[0];
  } else if (!project) {
    project = createProject();
  }
  
  return project;
}

function switchProject(projectId) {
  saveCurrentDraft(); // Save current work first
  const project = getAllProjects().find(p => p.id === projectId);
  if (project) {
    localStorage.setItem('scribex-current-project', projectId);
    loadProject(project);
  }
}

function loadProject(project) {
  const editor = document.getElementById('editor');
  editor.value = project.content || '';
  updateProjectTitle(project.title);
  lastSavedContent = project.content || '';
  initSession(); // Reset session tracking - must be before updateWordCount
  updateWordCount(); // Now calculate word count after session baseline is set
}

function deleteProject(projectId) {
  if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) {
    return;
  }
  
  const projects = getAllProjects().filter(p => p.id !== projectId);
  localStorage.setItem('scribex-projects', JSON.stringify(projects));
  
  // If deleting current project, switch to another
  if (localStorage.getItem('scribex-current-project') === projectId) {
    if (projects.length > 0) {
      switchProject(projects[0].id);
    } else {
      const newProject = createProject();
      switchProject(newProject.id);
    }
  }
  
  updateProjectList();
}

function updateProjectTitle(title) {
  const titleElement = document.getElementById('current-project-title');
  if (titleElement) {
    titleElement.textContent = title;
  }
}

function openProject(projectId) {
  switchProject(projectId);
  // Switch to editor tab
  document.querySelector('[data-tab="editor"]').click();
}

// ========== AUTO-SAVE FUNCTIONALITY ==========
let saveTimer;
let lastSavedContent = '';
let isSaving = false;

function createSaveIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'save-indicator';
  indicator.className = 'save-indicator';
  indicator.innerHTML = '<span class="save-text">All changes saved</span>';
  document.body.appendChild(indicator);
  return indicator;
}

let saveIndicatorTimeout;

function updateSaveIndicator(status) {
  const indicator = document.getElementById('save-indicator') || createSaveIndicator();
  const textElement = indicator.querySelector('.save-text');
  
  // Clear any existing timeout
  if (saveIndicatorTimeout) {
    clearTimeout(saveIndicatorTimeout);
  }
  
  // Make sure indicator is visible
  indicator.style.display = 'block';
  indicator.style.opacity = '1';
  
  switch(status) {
    case 'unsaved':
      textElement.textContent = 'Unsaved changes';
      indicator.className = 'save-indicator unsaved';
      break;
    case 'saving':
      textElement.textContent = 'Saving...';
      indicator.className = 'save-indicator saving';
      break;
    case 'saved':
      textElement.textContent = 'All changes saved';
      indicator.className = 'save-indicator saved';
      // Fade out after 2 seconds
      saveIndicatorTimeout = setTimeout(() => {
        indicator.style.opacity = '0';
        setTimeout(() => {
          indicator.style.display = 'none';
        }, 300); // Match transition duration
      }, 2000);
      break;
    case 'error':
      textElement.textContent = 'Error saving draft';
      indicator.className = 'save-indicator error';
      // Keep error visible for longer
      saveIndicatorTimeout = setTimeout(() => {
        indicator.style.opacity = '0';
        setTimeout(() => {
          indicator.style.display = 'none';
        }, 300);
      }, 5000);
      break;
  }
}

function saveCurrentDraft() {
  const editor = document.getElementById('editor');
  const content = editor.value;
  
  if (content === lastSavedContent) return;
  
  try {
    updateSaveIndicator('saving');
    const currentProject = getCurrentProject();
    currentProject.content = content;
    currentProject.lastModified = new Date().toISOString();
    currentProject.wordCount = countWords(content);
    saveProject(currentProject);
    lastSavedContent = content;
    updateSaveIndicator('saved');
  } catch (e) {
    console.error('Failed to save:', e);
    updateSaveIndicator('error');
  }
}

// Auto-save every 30 seconds
setInterval(saveCurrentDraft, 30000);

// Save on pause in typing (debounced)
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const debouncedSave = debounce(saveCurrentDraft, 2000);

// ========== WORD COUNTING UTILITIES ==========
let sessionStartWords = 0;
let sessionStartTime = Date.now();

function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function countCharacters(text, includeSpaces = true) {
  if (!text) return 0;
  return includeSpaces ? text.length : text.replace(/\s/g, '').length;
}

function estimateReadingTime(wordCount) {
  const wordsPerMinute = 200; // Average reading speed
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return minutes;
}

function updateWordCount() {
  const editor = document.getElementById('editor');
  const text = editor.value;
  
  const wordCount = countWords(text);
  const charCount = countCharacters(text);
  const readingTime = estimateReadingTime(wordCount);
  const sessionWords = wordCount - sessionStartWords;
  
  // Update display
  const wordCountEl = document.getElementById('word-count');
  const charCountEl = document.getElementById('char-count');
  const readingTimeEl = document.getElementById('reading-time');
  const sessionWordsEl = document.getElementById('session-words');
  
  if (wordCountEl) wordCountEl.textContent = wordCount.toLocaleString();
  if (charCountEl) charCountEl.textContent = charCount.toLocaleString();
  if (readingTimeEl) readingTimeEl.textContent = `${readingTime} min`;
  if (sessionWordsEl) {
    sessionWordsEl.textContent = sessionWords >= 0 ? `+${sessionWords}` : sessionWords.toString();
    sessionWordsEl.className = sessionWords < 0 ? 'stat-value negative' : 'stat-value';
  }
  
  // Update project word count
  const currentProject = getCurrentProject();
  if (currentProject) {
    currentProject.wordCount = wordCount;
  }
}

// Initialize session tracking
function initSession() {
  const currentProject = getCurrentProject();
  sessionStartWords = currentProject.wordCount || 0;
  sessionStartTime = Date.now();
}

// Track writing patterns (for future analytics)
function recordWritingSession() {
  const sessionData = {
    date: new Date().toISOString(),
    duration: Date.now() - sessionStartTime,
    wordsWritten: parseInt(document.getElementById('session-words')?.textContent || '0'),
    projectId: getCurrentProject().id
  };
  
  const sessions = JSON.parse(localStorage.getItem('scribex-sessions') || '[]');
  sessions.push(sessionData);
  
  // Keep only last 30 days of data
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentSessions = sessions.filter(s => 
    new Date(s.date).getTime() > thirtyDaysAgo
  );
  
  localStorage.setItem('scribex-sessions', JSON.stringify(recentSessions));
}

// ========== TAB NAVIGATION ==========
function initNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  const contents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Update active states
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`${targetTab}-tab`).classList.add('active');
      
      // Show/hide editor footer
      const editorFooter = document.getElementById('editor-footer');
      if (editorFooter) {
        if (targetTab === 'editor') {
          editorFooter.style.display = 'flex';
        } else {
          editorFooter.style.display = 'none';
        }
      }
      
      // Trigger tab-specific updates
      if (targetTab === 'dashboard') {
        updateDashboard();
      } else if (targetTab === 'profile') {
        updateProfile();
      }
    });
  });
}

function updateDashboard() {
  const projects = getAllProjects();
  const totalWords = projects.reduce((sum, p) => sum + (p.wordCount || 0), 0);
  
  document.getElementById('total-words').textContent = totalWords.toLocaleString();
  document.getElementById('total-projects').textContent = projects.length;
  
  // Calculate writing streak
  const sessions = JSON.parse(localStorage.getItem('scribex-sessions') || '[]');
  const streak = calculateWritingStreak(sessions);
  document.getElementById('writing-streak').textContent = `${streak} days`;
  
  // Update recent projects list
  const listContainer = document.getElementById('dashboard-project-list');
  listContainer.innerHTML = projects
    .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
    .slice(0, 5)
    .map(project => `
      <div class="project-summary" onclick="openProject('${project.id}')">
        <h4>${project.title}</h4>
        <p>${project.wordCount || 0} words • ${formatDate(project.lastModified)}</p>
      </div>
    `).join('');
}

function updateProfile() {
  // Update font selectors with current values
  const editor = document.getElementById('editor');
  const fontSelector = document.getElementById('font-selector');
  const sizeSelector = document.getElementById('size-selector');
  
  if (fontSelector && editor) {
    fontSelector.value = editor.style.fontFamily || "'Courier New', monospace";
  }
  if (sizeSelector && editor) {
    sizeSelector.value = editor.style.fontSize || '16px';
  }
}

function calculateWritingStreak(sessions) {
  if (sessions.length === 0) return 0;
  
  const today = new Date().toDateString();
  const dates = [...new Set(sessions.map(s => new Date(s.date).toDateString()))];
  dates.sort((a, b) => new Date(b) - new Date(a));
  
  let streak = 0;
  let currentDate = new Date();
  
  for (let i = 0; i < dates.length; i++) {
    const dateStr = currentDate.toDateString();
    if (dates.includes(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (i === 0 && dateStr === today) {
      // Today hasn't been written yet
      currentDate.setDate(currentDate.getDate() - 1);
      i--; // Check yesterday
    } else {
      break;
    }
  }
  
  return streak;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      return diffMinutes === 0 ? 'Just now' : `${diffMinutes} minutes ago`;
    }
    return `${diffHours} hours ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// ========== PROJECT LIST MODAL ==========
function updateProjectList() {
  const listContainer = document.getElementById('project-list');
  if (!listContainer) return;
  
  const projects = getAllProjects();
  const currentProjectId = localStorage.getItem('scribex-current-project');
  
  listContainer.innerHTML = projects
    .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
    .map(project => `
      <div class="project-item ${project.id === currentProjectId ? 'active' : ''}" 
           onclick="switchProject('${project.id}')">
        <div class="project-info">
          <div class="project-title">${project.title}</div>
          <div class="project-meta">
            ${project.wordCount || 0} words • ${formatDate(project.lastModified)}
          </div>
        </div>
        <div class="project-actions">
          <button class="icon-btn" onclick="event.stopPropagation(); deleteProject('${project.id}')" title="Delete project">
            🗑️
          </button>
        </div>
      </div>
    `).join('');
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Load and initialize current project
  const currentProject = getCurrentProject();
  loadProject(currentProject);
  
  // Initialize navigation
  initNavigation();
  
  // Initialize session tracking
  initSession();
  
  // Set up editor event listeners
  const editor = document.getElementById('editor');
  if (editor) {
    // Update word count on input
    editor.addEventListener('input', () => {
      updateWordCount();
      // Show unsaved indicator immediately when typing
      if (editor.value !== lastSavedContent) {
        updateSaveIndicator('unsaved');
      }
      debouncedSave();
    });
    
    // Save on blur
    editor.addEventListener('blur', saveCurrentDraft);
  }
  
  // Save before page unload
  window.addEventListener('beforeunload', (e) => {
    saveCurrentDraft();
    recordWritingSession();
  });
  
  // Save when switching tabs/windows
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      saveCurrentDraft();
    }
  });
  
  // Set up project title editing
  const projectTitle = document.getElementById('current-project-title');
  if (projectTitle) {
    projectTitle.addEventListener('blur', function() {
      const newTitle = this.textContent.trim();
      if (newTitle) {
        const project = getCurrentProject();
        project.title = newTitle;
        saveProject(project);
      }
    });
    
    projectTitle.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.blur();
      }
    });
  }
  
  // Set up project menu button
  const projectMenuBtn = document.getElementById('project-menu-btn');
  const projectModal = document.getElementById('project-modal');
  if (projectMenuBtn && projectModal) {
    projectMenuBtn.addEventListener('click', () => {
      updateProjectList();
      projectModal.style.display = 'block';
    });
  }
  
  // Set up new project button
  const newProjectBtn = document.getElementById('new-project-btn');
  if (newProjectBtn) {
    newProjectBtn.addEventListener('click', () => {
      const title = prompt('Enter project title:', 'Untitled Project');
      if (title) {
        const newProject = createProject(title);
        switchProject(newProject.id);
        projectModal.style.display = 'none';
      }
    });
  }
  
  // Set up font selectors
  const fontSelector = document.getElementById('font-selector');
  const sizeSelector = document.getElementById('size-selector');
  
  if (fontSelector) {
    fontSelector.addEventListener('change', function() {
      if (editor) editor.style.fontFamily = this.value;
      localStorage.setItem('scribex-font-family', this.value);
    });
    
    // Load saved font preference
    const savedFont = localStorage.getItem('scribex-font-family');
    if (savedFont && editor) {
      editor.style.fontFamily = savedFont;
      fontSelector.value = savedFont;
    }
  }
  
  if (sizeSelector) {
    sizeSelector.addEventListener('change', function() {
      if (editor) editor.style.fontSize = this.value;
      localStorage.setItem('scribex-font-size', this.value);
    });
    
    // Load saved size preference
    const savedSize = localStorage.getItem('scribex-font-size');
    if (savedSize && editor) {
      editor.style.fontSize = savedSize;
      sizeSelector.value = savedSize;
    }
  }
  
  // Existing modal code
  const modal = document.getElementById('prompt-modal');
  const editPromptBtn = document.getElementById('edit-prompt-btn');
  const closeBtn = document.querySelector('.close');
  const savePromptBtn = document.getElementById('save-prompt-btn');
  const resetPromptBtn = document.getElementById('reset-prompt-btn');
  const promptTextarea = document.getElementById('prompt-textarea');
  const processButton = document.getElementById('process-text-btn');

  // Open modal
  if (editPromptBtn) {
    editPromptBtn.addEventListener('click', function() {
      promptTextarea.value = loadPrompt();
      modal.style.display = 'block';
    });
  }

  // Close modal handlers
  document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', function() {
      this.closest('.modal').style.display = 'none';
    });
  });

  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
      event.target.style.display = 'none';
    }
  });

  // Save prompt
  if (savePromptBtn) {
    savePromptBtn.addEventListener('click', function() {
      const customPrompt = promptTextarea.value.trim();
      if (customPrompt) {
        savePrompt(customPrompt);
        modal.style.display = 'none';
        alert('Prompt saved successfully!');
      } else {
        alert('Please enter a prompt before saving.');
      }
    });
  }

  // Reset to default prompt
  if (resetPromptBtn) {
    resetPromptBtn.addEventListener('click', function() {
      if (!DEFAULT_PROMPT) {
        alert('Error: Default prompt not loaded. Cannot reset.');
        return;
      }
      if (confirm('Are you sure you want to reset to the default prompt?')) {
        promptTextarea.value = DEFAULT_PROMPT;
        savePrompt(DEFAULT_PROMPT);
        alert('Prompt reset to default.');
      }
    });
  }

  // Process text button - add custom prompt to HTMX request
  if (processButton) {
    processButton.addEventListener('htmx:configRequest', function(evt) {
      evt.detail.parameters['custom_prompt'] = loadPrompt();
    });

    // Handle button text during processing
    const originalButtonText = processButton.innerHTML;
    
    processButton.addEventListener('htmx:beforeRequest', function(evt) {
      if (evt.detail.elt === this) {
        this.disabled = true;
        this.innerHTML = 'Processing...'; 
      }
    });

    processButton.addEventListener('htmx:afterRequest', function(evt) {
      if (evt.detail.elt === this) {
        this.disabled = false;
        this.innerHTML = originalButtonText;
      }
    });
  }
});

// Handle HTMX after swap - show/hide output div
document.addEventListener('htmx:afterSwap', function(event) {
  if (event.detail.target.id === 'llm-output') {
    const outputDiv = event.detail.target;
    outputDiv.style.display = outputDiv.innerHTML.trim() ? 'block' : 'none';
  }
}); 