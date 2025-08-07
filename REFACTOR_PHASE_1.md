# REFACTOR Phase 1: Foundation (Week 1)

## Overview
This phase establishes the foundational utilities and patterns needed for subsequent refactoring phases. It focuses on eliminating immediate DRY violations and creating shared infrastructure while minimizing risk to existing functionality.

## Core Objectives
- Extract shared utilities and constants
- Consolidate duplicated CSS  
- Create base service patterns
- Establish consistent patterns for future phases

## Architectural Philosophy Alignment

✅ **Every Line Fights for Its Life**: Eliminates duplicate `formatDate()`, `.primary-btn` styles, and OpenAI client initialization  
✅ **No Premature Abstraction**: Only abstracting utilities that are already duplicated (2+ uses)  
✅ **Local over Global**: Keeping utilities focused and specific  
✅ **Direct over indirect**: Simple utility functions with clear purposes  

---

## Task 1: Extract Shared Utilities

### 1.1 Create Date Formatting Utility

**Problem**: `formatDate()` function duplicated in:
- `src/lib/components/ProjectModal.svelte:42-62`
- `src/routes/dashboard/+page.svelte:31-51`

**Action Items**:
1. Create `src/lib/utils/dateFormat.ts`
2. Extract the common logic (handle relative time formatting)
3. Update both components to import and use the utility
4. Test functionality remains identical

**Implementation**:
```ts
// src/lib/utils/dateFormat.ts
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
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
```

**Verification Steps**:
- Test date formatting edge cases (same day, yesterday, week ago, older)
- Ensure components display dates identically to before
- Verify no TypeScript errors

### 1.2 Create API Utilities

**Problem**: OpenAI client initialization duplicated in:
- `src/routes/api/analyze-inline/+server.ts:9-18`
- `src/routes/api/process-text/+server.ts:6-15`

**Action Items**:
1. Create `src/lib/utils/openai.ts`
2. Extract client initialization with error handling
3. Update both API routes to use the utility
4. Ensure error handling remains consistent

**Implementation**:
```ts
// src/lib/utils/openai.ts
import OpenAI from 'openai';
import { env } from '$env/dynamic/private';

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    try {
      _client = new OpenAI({ apiKey });
    } catch (e) {
      throw new Error(`Failed to initialize OpenAI client: ${e}`);
    }
  }
  
  return _client;
}
```

**Benefits**:
- Single source of truth for OpenAI configuration
- Consistent error handling across API routes
- Lazy initialization pattern for better performance
- Easier to modify OpenAI settings in the future

---

## Task 2: Consolidate CSS Patterns

### 2.1 Extract Primary Button Styles

**Problem**: `.primary-btn` CSS duplicated in:
- `src/lib/components/ProjectModal.svelte:104-119`  
- `src/lib/components/PromptModal.svelte:116-129`

**Action Items**:
1. Add `.primary-btn` to global styles in `src/app.css`
2. Remove duplicated CSS from components
3. Verify button appearance remains identical
4. Document the global utility class

**Approach**: Following ARCHITECTURE.md, this qualifies as a global utility since it's used across multiple components and has consistent styling.

**Implementation**:
```css
/* Add to src/app.css after existing .icon-btn */
.primary-btn {
  background-color: var(--color-primary);
  color: white;
  border: none;
  padding: 10px var(--space-lg);
  font-size: 16px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.primary-btn:hover {
  background-color: #45a049;
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Component Updates**:
- Remove local `.primary-btn` styles from both components
- Verify buttons retain functionality and appearance
- Add disabled state handling if needed

---

## Task 3: Centralize Storage Constants

### 3.1 Create Storage Constants File

**Problem**: Storage keys hardcoded across multiple files with inconsistent patterns

**Current State**:
- `StorageService.ts` defines private readonly keys
- `sessions.ts` uses hardcoded `'scribex-sessions'`
- `preferences.ts` uses individual `localStorage.getItem` calls with hardcoded keys

**Action Items**:
1. Create `src/lib/constants/storage.ts`
2. Define all storage keys in one place
3. Update all files to import and use constants
4. Ensure backward compatibility (no key changes)

**Implementation**:
```ts
// src/lib/constants/storage.ts
export const STORAGE_KEYS = {
  PROJECTS: 'scribex-projects',
  CURRENT_PROJECT: 'scribex-current-project', 
  SESSIONS: 'scribex-sessions',
  PROMPT: 'scribex-prompt',
  FONT_FAMILY: 'scribex-font-family',
  FONT_SIZE: 'scribex-font-size'
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
```

**File Updates**:
1. `StorageService.ts`: Replace private constants with imports
2. `sessions.ts`: Import and use `STORAGE_KEYS.SESSIONS`
3. `preferences.ts`: Import and use font-related keys

**Benefits**:
- Single source of truth for storage keys
- TypeScript compile-time checking for key validity
- Easier to rename keys consistently across codebase
- Clear documentation of all stored data

---

## Task 4: Create Base Service Patterns

### 4.1 Establish Service Interface Pattern

**Goal**: Create consistent patterns for service creation that will be used in later phases

**Action Items**:
1. Create `src/lib/services/types.ts` for common service interfaces
2. Establish error handling patterns
3. Create base patterns for localStorage services

**Implementation**:
```ts
// src/lib/services/types.ts
export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
}

export abstract class BaseStorageService<T> {
  constructor(protected key: string) {}
  
  protected safeGet(): T | null {
    try {
      const stored = localStorage.getItem(this.key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error(`Failed to read ${this.key}:`, error);
      return null;
    }
  }
  
  protected safeSave(data: T): boolean {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Failed to save ${this.key}:`, error);
      return false;
    }
  }
}
```

**Philosophy Check**: This creates a minimal base class that eliminates the try/catch boilerplate present in multiple services, without over-abstracting. It provides value immediately and sets up patterns for future phases.

---

## Testing & Validation

### Manual Testing Checklist
- [ ] Date formatting displays identically in Project Modal and Dashboard
- [ ] Primary buttons function and appear identically in all modals
- [ ] OpenAI API calls work correctly in both inline and batch processing
- [ ] All localStorage operations continue to work
- [ ] No console errors or TypeScript compilation issues

### Automated Testing Considerations
- Unit tests for `formatDate()` utility with various date inputs
- Unit tests for storage key constants (compile-time validation)
- Integration tests for API utilities

---

## Risk Assessment

### Low Risk Items ✅
- Date formatting utility extraction (pure function)
- Storage constants (no behavior change)
- Primary button CSS (visual only)

### Medium Risk Items ⚠️  
- OpenAI client refactoring (touches API functionality)
- Base service patterns (new architecture)

### Mitigation Strategies
- Test API endpoints thoroughly after OpenAI client changes
- Keep base service patterns minimal and optional for this phase
- Maintain exact same localStorage keys to preserve user data
- Deploy changes incrementally with rollback plan

---

## Success Criteria

1. **Code Reduction**: Eliminate ~50 lines of duplicated code
2. **Consistency**: All date formatting and button styling consistent
3. **Maintainability**: Single source of truth for utilities and constants
4. **Zero Regression**: All existing functionality works identically
5. **Foundation Set**: Patterns established for subsequent phases

## Next Phase Preparation

This phase establishes the foundation needed for Phase 2:
- Shared utilities ready for use in new components
- CSS patterns established for consistent styling
- Service patterns ready for feedback manager implementation
- Storage layer simplified for easier testing and modification

**Architectural Fitness**: This phase strongly aligns with the minimalist philosophy by eliminating obvious duplication without creating unnecessary abstractions. Every utility created is already in use 2+ times, ensuring we're not building "just in case" infrastructure.