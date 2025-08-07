# REFACTOR Phase 2: Component Decomposition (Week 2-3)

## Overview
This phase begins the systematic decomposition of the monolithic main page component (897 lines) by extracting clearly defined, self-contained components. The goal is to reduce coupling while maintaining the existing functionality and user experience.

## Core Objectives
- Extract footer, sidebar, and modal components from main page
- Create feedback management service
- Begin main page component breakdown with lowest-risk extractions
- Establish component composition patterns

## Architectural Philosophy Alignment

✅ **Every Line Fights for Its Life**: Each extracted component has a single, clear responsibility  
✅ **No Premature Abstraction**: Only extracting components with clear boundaries and multiple responsibilities  
✅ **Local over Global**: Component state remains local where possible  
✅ **Direct over indirect**: Clear, simple component interfaces  

---

## Task 1: Extract Editor Footer Component

### 1.1 Create EditorFooter.svelte

**Problem**: Footer logic mixed with editor logic in main page component (`src/routes/+page.svelte:503-534`)

**Justification**: Footer has clear boundaries, distinct styling, and separate concerns from editor functionality.

**Action Items**:
1. Create `src/lib/components/EditorFooter.svelte`
2. Move footer HTML, CSS, and logic from main page
3. Define clean props interface for data passing
4. Test footer functionality independently

**Component Boundaries**:
```svelte
<!-- src/lib/components/EditorFooter.svelte -->
<script lang="ts">
  interface Props {
    wordCount: number;
    charCount: number;
    readingTime: number;
    sessionWords: number;
    processing: boolean;
    onProcessText: () => void;
    onEditPrompt: () => void;
  }
  
  let { 
    wordCount, 
    charCount, 
    readingTime, 
    sessionWords, 
    processing, 
    onProcessText, 
    onEditPrompt 
  }: Props = $props();
</script>
```

**Benefits**:
- Removes ~80 lines from main component
- Footer can be tested independently
- Clear separation of presentation and business logic
- Reusable across different editor contexts

**Main Page Integration**:
```svelte
<!-- In src/routes/+page.svelte -->
<EditorFooter 
  {wordCount}
  {charCount}
  {readingTime}
  {sessionWords}
  {processing}
  onProcessText={processText}
  onEditPrompt={() => showPromptModal = true}
/>
```

### 1.2 Extract Sidebar Toggle Logic

**Problem**: Sidebar toggle button logic embedded in main editor layout

**Action Items**:
1. Create `SidebarToggle.svelte` component
2. Move toggle button HTML and styling
3. Simplify props interface
4. Maintain consistent positioning

**Implementation Focus**:
- Clean props interface (isOpen, feedbackCount, onToggle)
- Self-contained styling and behavior
- Accessible button with proper ARIA labels

---

## Task 2: Create Feedback Management Service

### 2.1 Analyze Current Feedback Flow

**Current State Analysis** (`src/routes/+page.svelte`):
- Lines 189-276: Feedback marker positioning logic
- Lines 15-22, 25-33: Feedback re-rendering effects  
- Lines 272-276: Marker click handling
- Complex DOM manipulation for overlay positioning

**Problem**: Feedback logic scattered across multiple concerns:
- Store management (project store)
- DOM positioning calculations  
- Event handling
- Visual presentation

### 2.2 Design FeedbackManager Service

**Service Responsibilities**:
- Centralize feedback positioning calculations
- Manage feedback lifecycle (create, update, dismiss)
- Coordinate between store and UI components
- Handle marker click events

**Action Items**:
1. Create `src/lib/services/feedbackManager.ts`
2. Extract positioning logic from main component
3. Create clean interface for feedback operations
4. Implement service in main component

**Implementation**:
```ts
// src/lib/services/feedbackManager.ts
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
  
  constructor({ editorElement, overlayElement }: FeedbackManagerOptions) {
    this.editorElement = editorElement;
    this.overlayElement = overlayElement;
  }
  
  updateMarkers(feedback: InlineFeedback[]): void {
    // Extract from lines 189-216 in main component
  }
  
  private getTextPositionInEditor(index: number): FeedbackPosition | null {
    // Extract from lines 218-245 in main component
  }
  
  private createMarkerElement(feedback: InlineFeedback, position: FeedbackPosition): HTMLElement {
    // Extract marker creation logic
  }
  
  onMarkerClick(feedbackId: string, callback: (id: string) => void): void {
    // Handle marker click events
  }
}
```

**Benefits**:
- Removes ~90 lines from main component
- Encapsulates complex DOM manipulation logic
- Easier to test positioning calculations
- Cleaner separation between business logic and presentation

### 2.3 Feedback Service Integration

**Main Component Changes**:
1. Import and instantiate FeedbackManager
2. Replace inline positioning logic with service calls
3. Simplify feedback-related effects
4. Maintain exact same visual behavior

**Testing Strategy**:
- Unit tests for positioning calculations
- Integration tests for marker rendering
- Visual regression tests for feedback display

---

## Task 3: Extract Session Tracking Logic

### 3.1 Create SessionTracker Component

**Problem**: Session tracking mixed with editor logic (`src/routes/+page.svelte:298-371`)

**Component Responsibilities**:
- Track writing session start/end
- Calculate session words
- Handle visibility change events
- Record sessions on page unload

**Action Items**:
1. Create `src/lib/components/SessionTracker.svelte`
2. Extract session-related event listeners
3. Create clean props interface for word count updates
4. Maintain session persistence behavior

**Implementation**:
```svelte
<!-- src/lib/components/SessionTracker.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { sessions } from '$lib/stores/sessions';
  
  interface Props {
    currentWordCount: number;
    projectId: string;
  }
  
  let { currentWordCount, projectId }: Props = $props();
  
  let sessionStartWords = $state(0);
  let sessionStartTime = $state(Date.now());
  
  // Extract session management logic from main component
  // Lines 304-371
</script>

<!-- No template - this is a logic-only component -->
```

**Benefits**:
- Removes ~70 lines from main component
- Session logic can be tested independently
- Clear responsibility separation
- Reusable across different editor implementations

---

## Task 4: Begin Main Page Component Breakdown

### 4.1 Reorganize Remaining Main Component

**Target Structure**:
```svelte
<!-- Simplified src/routes/+page.svelte structure -->
<script lang="ts">
  // Core editor state and logic only
  // Import extracted components and services
  // Coordinate between components
</script>

<div class="editor-container">
  <div class="main-content">
    <div class="editor-wrapper">
      <!-- Core editor contenteditable -->
      <!-- Feedback overlay -->
    </div>
    
    <SidebarToggle {showSidebar} {feedbackCount} onToggle={toggleSidebar} />
    
    <div class="sidebar-container" class:open={showSidebar}>
      <FeedbackSidebar {feedback} {isOpen} {selectedFeedbackId} />
    </div>
  </div>

  <EditorFooter 
    {wordCount} {charCount} {readingTime} {sessionWords}
    {processing} {onProcessText} {onEditPrompt} 
  />
</div>

<!-- Logic-only components -->
<SessionTracker {wordCount} projectId={$currentProject?.id} />

<!-- Modals remain for now -->
<PromptModal {showPromptModal} onclose={() => showPromptModal = false} />
```

### 4.2 Component State Management

**State Ownership Principles**:
- **Editor content**: Remains in main component (core responsibility)
- **Feedback data**: Managed by project store, coordinated by FeedbackManager
- **UI state** (modals, sidebar): Local to main component
- **Session data**: Owned by SessionTracker component

**Props vs Services Decision Matrix**:
- **Simple data flow**: Use props (word count, processing state)
- **Complex coordination**: Use services (feedback positioning, session management)
- **Event handling**: Use callback props (button clicks, toggle actions)

---

## Task 5: Enhanced Modal Patterns

### 5.1 Analyze Current Modal Usage

**Current Modals**:
- `Modal.svelte` (base component) - 135 lines
- `ProjectModal.svelte` - uses base modal
- `PromptModal.svelte` - uses base modal

**Assessment**: Current modal pattern is already well-abstracted. Base Modal component provides:
- Keyboard handling (ESC to close)
- Backdrop click handling
- Focus management
- Consistent styling

### 5.2 Modal Pattern Enhancements (Optional)

**Potential Improvements** (evaluate necessity):
1. Standard action button patterns
2. Form validation integration
3. Loading state management

**Architectural Check**: Current modal pattern follows "direct over indirect" principle well. Only enhance if clear duplication emerges.

**Recommendation**: Keep current modal pattern as-is for this phase. Monitor for duplication in subsequent phases.

---

## Testing & Validation Strategy

### Component Testing Plan

1. **EditorFooter Component**:
   - Props interface validation
   - Button click event handling
   - Statistics display formatting
   - Processing state visual feedback

2. **FeedbackManager Service**:
   - Positioning calculation accuracy
   - Marker creation and cleanup
   - DOM event handling
   - Edge cases (empty feedback, invalid positions)

3. **SessionTracker Component**:
   - Session timing accuracy
   - Page visibility handling
   - Word count delta calculations
   - Persistence on page unload

### Integration Testing

1. **Component Composition**:
   - Verify main page still functions identically
   - Check data flow between components
   - Test edge cases (empty projects, error states)

2. **User Workflow Testing**:
   - Complete writing session from start to finish
   - Feedback interaction (click markers, sidebar)
   - Modal interactions remain unchanged

---

## Risk Assessment & Mitigation

### High Risk Areas ⚠️

1. **Feedback Positioning Logic**: Complex DOM manipulation
   - *Mitigation*: Extensive visual testing, pixel-perfect comparisons
   - *Rollback*: Keep original positioning code commented until verified

2. **Session Tracking**: Page lifecycle events
   - *Mitigation*: Test across multiple browsers and scenarios
   - *Rollback*: Maintain session data integrity during refactor

### Medium Risk Areas

1. **Component State Synchronization**: Data flow between extracted components
   - *Mitigation*: Clear prop interfaces, comprehensive integration tests

2. **Event Handler References**: Callback prop passing
   - *Mitigation*: Explicit prop types, runtime validation in development

### Low Risk Areas ✅

1. **Footer Extraction**: Clear boundaries, simple props
2. **Service Creation**: New code, doesn't modify existing functionality
3. **Modal Patterns**: Already well-abstracted

---

## Success Criteria

1. **Line Count Reduction**: Main component reduced from 897 to ~600 lines
2. **Component Separation**: Each extracted component has single responsibility
3. **Functionality Preservation**: Zero regressions in user functionality  
4. **Code Clarity**: Each component's purpose is immediately obvious
5. **Testing Foundation**: Components can be tested independently

## Phase 3 Preparation

This phase sets up the foundation for Phase 3 component composition:
- FeedbackManager service ready for further decomposition
- Component boundaries established for editor core extraction
- Patterns proven for service-component coordination
- Risk-reduction through incremental extraction

**Architectural Assessment**: This phase maintains the balance between necessary decomposition and avoiding over-abstraction. Each extracted component solves a real coupling problem in the current codebase while establishing patterns for the more complex Phase 3 work.