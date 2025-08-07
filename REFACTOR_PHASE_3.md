# REFACTOR Phase 3: Architecture Refinement (Week 4)

## Overview
This phase completes the main page component decomposition by extracting the core editor functionality and implementing composition patterns. This is the most architecturally significant phase, requiring careful attention to component boundaries and data flow.

## Core Objectives
- Complete main page decomposition to target <300 lines
- Extract EditorCore and FeedbackOverlay components
- Implement clean composition patterns
- Enhance type safety across component interfaces
- Establish patterns for future feature development

## Architectural Philosophy Alignment

✅ **Every Line Fights for Its Life**: Each component serves a specific, necessary purpose  
✅ **No Premature Abstraction**: Only creating abstractions that eliminate actual complexity  
✅ **Local over Global**: State remains as local as possible while enabling necessary coordination  
✅ **Direct over indirect**: Simple, clear component interfaces with explicit data flow  

---

## Task 1: Extract Core Editor Component

### 1.1 Analyze Editor Boundaries

**Current State** (`src/routes/+page.svelte`):
- Lines 168-179: Input handling and content extraction
- Lines 434-444: Contenteditable editor element
- Lines 277-296: Keyboard event handling (Enter key detection)
- Lines 581-600: Editor styling

**Component Responsibility**: Pure text editing functionality without feedback, analysis, or session concerns.

### 1.2 Create EditorCore.svelte

**Action Items**:
1. Create `src/lib/components/EditorCore.svelte`
2. Extract contenteditable functionality
3. Define clean props interface for content binding
4. Handle input events and keyboard detection
5. Maintain editor styling and behavior

**Component Interface Design**:
```svelte
<!-- src/lib/components/EditorCore.svelte -->
<script lang="ts">
  interface Props {
    content: string;
    fontFamily: string;
    fontSize: string;
    onContentChange: (newContent: string) => void;
    onParagraphComplete?: () => void; // For analysis triggers
  }
  
  let { 
    content, 
    fontFamily, 
    fontSize, 
    onContentChange, 
    onParagraphComplete 
  }: Props = $props();
  
  let editorElement: HTMLDivElement;
  let isUpdatingContent = false;
  
  // Extract input handling logic (lines 168-179)
  function handleInput() {
    if (isUpdatingContent) return;
    
    const plainText = extractPlainText(editorElement);
    onContentChange(plainText);
  }
  
  // Extract keyboard handling (lines 277-296)
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && onParagraphComplete) {
      // Detect double-enter for paragraph completion
      const caretPos = getCaretPosition(editorElement);
      const textBeforeCursor = content.slice(0, caretPos);
      
      if (textBeforeCursor.endsWith('\n')) {
        setTimeout(() => onParagraphComplete?.(), 100);
      }
    }
  }
</script>

<div 
  bind:this={editorElement}
  contenteditable="true"
  class="rich-editor"
  style="font-family: {fontFamily}; font-size: {fontSize};"
  oninput={handleInput}
  onkeydown={handleKeydown}
></div>
```

**Benefits**:
- Removes ~50 lines from main component
- Editor can be tested independently with mock content
- Clear separation between editing and other concerns
- Reusable for different editor contexts
- Props interface enforces explicit data flow

### 1.3 Editor Integration Patterns

**Main Component Integration**:
```svelte
<!-- In src/routes/+page.svelte -->
<EditorCore 
  {editorContent}
  fontFamily={$preferences.fontFamily}
  fontSize={$preferences.fontSize}
  onContentChange={(newContent) => editorContent = newContent}
  onParagraphComplete={analyzeNewContent}
/>
```

**State Management Principle**: Content state remains in main component since it's the coordination point for multiple concerns (saving, analysis, feedback).

---

## Task 2: Extract Feedback Overlay Component

### 2.1 Component Responsibility Analysis

**Current Overlay Logic** (`src/routes/+page.svelte`):
- Lines 446-451: Overlay element and positioning
- Lines 565-580: Overlay CSS styling
- Coordinates with FeedbackManager for marker positioning

**Component Purpose**: Visual presentation layer for feedback markers, separate from positioning calculations.

### 2.2 Create FeedbackOverlay.svelte

**Action Items**:
1. Create `src/lib/components/FeedbackOverlay.svelte`
2. Extract overlay HTML structure and styling
3. Integrate with FeedbackManager service
4. Handle marker click events cleanly

**Implementation**:
```svelte
<!-- src/lib/components/FeedbackOverlay.svelte -->
<script lang="ts">
  import type { InlineFeedback } from '$lib/models/Project';
  import { FeedbackManager } from '$lib/services/feedbackManager';
  
  interface Props {
    feedback: InlineFeedback[];
    editorElement: HTMLDivElement | null;
    onMarkerClick: (feedbackId: string) => void;
  }
  
  let { feedback, editorElement, onMarkerClick }: Props = $props();
  
  let overlayElement: HTMLDivElement;
  let feedbackManager: FeedbackManager | null = null;
  
  // Initialize feedback manager when elements are ready
  $effect(() => {
    if (editorElement && overlayElement && !feedbackManager) {
      feedbackManager = new FeedbackManager({
        editorElement,
        overlayElement
      });
    }
  });
  
  // Update markers when feedback changes
  $effect(() => {
    if (feedbackManager && feedback.length >= 0) {
      feedbackManager.updateMarkers(feedback);
      feedbackManager.onMarkerClick(onMarkerClick);
    }
  });
</script>

<div 
  bind:this={overlayElement}
  class="feedback-overlay"
  aria-hidden="true"
></div>
```

**Benefits**:
- Clear separation between overlay presentation and positioning logic
- FeedbackManager encapsulation maintained
- Easy to modify overlay behavior without affecting positioning
- Testable marker rendering logic

---

## Task 3: Create Inline Analysis Manager

### 3.1 Extract Analysis Logic

**Current Analysis State** (`src/routes/+page.svelte`):
- Lines 90-149: Analysis timing and content processing
- Lines 49-51: Analysis timer state management
- Complex sentence extraction and API coordination

**Component Responsibility**: Manage analysis triggers, timing, and API communication without UI concerns.

### 3.2 Create InlineAnalysisManager.svelte

**Design Consideration**: This is a logic-only component (no template) that coordinates analysis triggers and API calls.

**Action Items**:
1. Create `src/lib/components/InlineAnalysisManager.svelte`
2. Extract analysis timing logic
3. Handle sentence extraction and API communication
4. Provide clean interface for triggering analysis

**Implementation**:
```svelte
<!-- src/lib/components/InlineAnalysisManager.svelte -->
<script lang="ts">
  import type { Project } from '$lib/models/Project';
  import { projectStore } from '$lib/stores/projects';
  
  interface Props {
    content: string;
    currentProject: Project | null;
    onParagraphTrigger?: boolean; // External trigger signal
  }
  
  let { content, currentProject, onParagraphTrigger = false }: Props = $props();
  
  let analysisTimer: number | null = null;
  
  // Schedule analysis on content change (5-second timer)
  $effect(() => {
    if (content && currentProject) {
      scheduleAnalysis();
    }
  });
  
  // Immediate analysis on paragraph completion
  $effect(() => {
    if (onParagraphTrigger && currentProject) {
      if (analysisTimer) clearTimeout(analysisTimer);
      analyzeNewContent();
    }
  });
  
  function scheduleAnalysis() {
    if (analysisTimer) clearTimeout(analysisTimer);
    analysisTimer = setTimeout(() => {
      analyzeNewContent();
    }, 5000);
  }
  
  async function analyzeNewContent() {
    // Extract analysis logic from main component (lines 105-149)
    if (!currentProject) return;
    
    const currentAnalyzedPosition = currentProject.lastAnalyzedPosition || 0;
    const newContent = content.slice(currentAnalyzedPosition);
    const sentences = extractCompleteSentences(newContent);
    
    if (sentences.length === 0) return;
    
    // API call and feedback processing logic
    // Update project store with new feedback
  }
  
  function extractCompleteSentences(text: string): string[] {
    // Extract sentence parsing logic (lines 151-166)
  }
</script>

<!-- No template - this is a logic-only component -->
```

**Benefits**:
- Removes ~80 lines from main component
- Analysis logic can be tested independently
- Clear separation of analysis timing from editor functionality
- Easy to modify analysis behavior without affecting editor

---

## Task 4: Implement Composition Pattern

### 4.1 Final Main Component Structure

**Target Architecture**:
```svelte
<!-- Simplified src/routes/+page.svelte (~250 lines) -->
<script lang="ts">
  // Core imports and stores
  import EditorCore from '$lib/components/EditorCore.svelte';
  import FeedbackOverlay from '$lib/components/FeedbackOverlay.svelte';
  import InlineAnalysisManager from '$lib/components/InlineAnalysisManager.svelte';
  import SessionTracker from '$lib/components/SessionTracker.svelte';
  import EditorFooter from '$lib/components/EditorFooter.svelte';
  import SidebarToggle from '$lib/components/SidebarToggle.svelte';
  
  // Coordination state only
  let editorContent = $state('');
  let editorElement = $state<HTMLDivElement>();
  let showSidebar = $state(false);
  let showPromptModal = $state(false);
  let selectedFeedbackId = $state<string | null>(null);
  let paragraphTrigger = $state(false);
  
  // Computed values for child components
  const wordCount = $derived(/* calculation */);
  const charCount = $derived(/* calculation */);
  const readingTime = $derived(/* calculation */);
  
  // Event handlers for child components
  function handleContentChange(newContent: string) {
    editorContent = newContent;
  }
  
  function handleParagraphComplete() {
    paragraphTrigger = !paragraphTrigger; // Toggle to trigger analysis
  }
  
  function handleMarkerClick(feedbackId: string) {
    selectedFeedbackId = feedbackId;
    showSidebar = true;
  }
</script>

<div class="editor-container">
  <div class="main-content">
    <div class="editor-wrapper">
      <div class="editor-content">
        <EditorCore 
          content={editorContent}
          fontFamily={$preferences.fontFamily}
          fontSize={$preferences.fontSize}
          onContentChange={handleContentChange}
          onParagraphComplete={handleParagraphComplete}
        />
        
        <FeedbackOverlay 
          feedback={$currentProject?.inlineFeedback || []}
          {editorElement}
          onMarkerClick={handleMarkerClick}
        />
      </div>
    </div>
    
    <SidebarToggle 
      isOpen={showSidebar}
      feedbackCount={($currentProject?.inlineFeedback || []).filter(f => !f.dismissed).length}
      onToggle={() => showSidebar = !showSidebar}
    />
    
    <div class="sidebar-container" class:open={showSidebar}>
      <FeedbackSidebar {feedback} isOpen={showSidebar} {selectedFeedbackId} />
    </div>
  </div>

  <EditorFooter 
    {wordCount} {charCount} {readingTime}
    sessionWords={/* calculated */}
    {processing}
    onProcessText={processText}
    onEditPrompt={() => showPromptModal = true}
  />
</div>

<!-- Logic-only components -->
<SessionTracker currentWordCount={wordCount} projectId={$currentProject?.id} />
<InlineAnalysisManager 
  content={editorContent}
  currentProject={$currentProject}
  onParagraphTrigger={paragraphTrigger}
/>

<!-- Modals -->
<PromptModal showModal={showPromptModal} onclose={() => showPromptModal = false} />
```

### 4.2 Data Flow Architecture

**State Ownership Principles**:
1. **Coordination State**: Main component owns UI state (modals, sidebar visibility)
2. **Content State**: Main component owns editor content (needs to coordinate saves, analysis, etc.)
3. **Component State**: Each component owns its internal presentation state
4. **Service State**: Services own complex business logic state

**Communication Patterns**:
- **Down**: Props for data and configuration
- **Up**: Callback props for events and state changes
- **Sideways**: Services for complex coordination (FeedbackManager)

---

## Task 5: Enhance Type Safety

### 5.1 Strengthen Component Props Interfaces

**Action Items**:
1. Define strict TypeScript interfaces for all component props
2. Add runtime validation in development mode
3. Create shared types for common data structures
4. Enhance error handling with proper types

**Shared Types Creation**:
```ts
// src/lib/types/editor.ts
export interface EditorState {
  content: string;
  wordCount: number;
  charCount: number;
  readingTime: number;
}

export interface EditorEvents {
  onContentChange: (content: string) => void;
  onParagraphComplete?: () => void;
  onSave?: () => void;
}

// src/lib/types/feedback.ts
export interface FeedbackUIState {
  showSidebar: boolean;
  selectedFeedbackId: string | null;
}

export interface FeedbackEvents {
  onMarkerClick: (feedbackId: string) => void;
  onToggleSidebar: () => void;
  onDismissFeedback: (feedbackId: string) => void;
}
```

### 5.2 API Response Type Safety

**Current Issue**: API responses loosely typed

**Enhancement**:
```ts
// src/lib/types/api.ts
export interface InlineAnalysisResponse {
  feedback: InlineFeedback[];
}

export interface ProcessTextResponse {
  response: string;
}

export interface APIError {
  code: number;
  message: string;
  details?: unknown;
}
```

---

## Testing Strategy

### Unit Testing Plan

1. **EditorCore Component**:
   - Content change event emission
   - Keyboard event handling
   - Paragraph completion detection
   - Content extraction accuracy

2. **FeedbackOverlay Component**:
   - Marker rendering with various feedback types
   - Click event handling
   - Integration with FeedbackManager
   - Overlay positioning edge cases

3. **InlineAnalysisManager Component**:
   - Analysis timing behavior (5-second delay)
   - Paragraph completion triggers
   - Sentence extraction accuracy
   - API error handling

### Integration Testing

1. **Component Composition**:
   - Data flow between components
   - Event propagation
   - State synchronization
   - Error boundary behavior

2. **Service Integration**:
   - FeedbackManager with overlay component
   - Analysis manager with project store
   - Session tracker with page lifecycle

---

## Risk Assessment

### High Risk Areas ⚠️

1. **State Synchronization**: Complex data flow between components
   - *Mitigation*: Comprehensive integration tests, explicit prop typing
   - *Monitoring*: Watch for state inconsistencies in testing

2. **Analysis Timing**: Behavior changes in analysis triggers
   - *Mitigation*: Extensive testing of timing scenarios
   - *Rollback Plan*: Keep original analysis logic available

### Medium Risk Areas

1. **Component Boundaries**: May have overlooked some coupling
   - *Mitigation*: Thorough code review, incremental extraction

2. **Performance Impact**: Multiple components vs. single component
   - *Mitigation*: Performance testing, bundle size monitoring

---

## Success Criteria

1. **Line Count Target**: Main component reduced to <300 lines (from 897)
2. **Single Responsibility**: Each component has one clear purpose
3. **Type Safety**: All component interfaces strongly typed
4. **Functionality Preservation**: Zero regressions in user experience
5. **Testability**: Each component can be tested in isolation
6. **Maintainability**: Clear code organization with obvious modification points

## Phase 4 Preparation

This phase establishes the final architecture foundation:
- Clean component boundaries for future feature development
- Service patterns proven for complex business logic
- Type safety infrastructure for reliable development
- Testing patterns established for component validation

**Architectural Assessment**: This phase represents the most significant architectural change while maintaining the minimalist philosophy. Each component extraction solves a real complexity problem, and the composition pattern provides clear data flow without over-abstracting. The resulting architecture should be significantly more maintainable while preserving the direct, simple patterns valued in the existing codebase.