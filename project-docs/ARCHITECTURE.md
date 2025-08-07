# Scribex Writer Architecture

This document outlines the technical architecture and design decisions for the Scribex Writer project.

## Core Principles

### Every Line Fights for Its Life

Our codebase follows a strict minimalism principle:
- **No dead code**: Unused variables, functions, or components must be deleted
- **No premature abstraction**: Don't create wrappers, stores, or utilities "just in case"
- **Local over global**: Prefer component state over global stores unless truly needed
- **Direct over indirect**: `showModal = true` beats `uiStore.openModal()`

Example: We use local state for modals instead of a global UI store because the modals are only triggered from their parent components. The 40+ lines of store code provided no value over simple boolean state.

## CSS Architecture

### Philosophy

Our CSS architecture follows a component-scoped approach that prioritizes:
- **Minimalism**: Only the CSS each component needs
- **Clarity**: Easy for both humans and LLMs to understand where styles live
- **Maintainability**: Delete a component, delete its CSS

### Structure

#### Global Styles (`src/app.css`)
Contains only truly global elements:
- **Design tokens**: CSS custom properties for colors, spacing, transitions
- **Base styles**: HTML/body resets and defaults  
- **Global utilities**: Classes used across multiple components (e.g., `.icon-btn`)

```css
:root {
  --color-primary: #4CAF50;
  --space-sm: 8px;
  --transition: all 0.3s ease;
  /* ... */
}
```

#### Component Styles
Each Svelte component contains its own styles in a `<style>` block:
- Automatically scoped by Svelte (no CSS leakage)
- Co-located with the component's HTML and JavaScript
- Uses global design tokens for consistency

```svelte
<!-- Component.svelte -->
<style>
  .modal {
    background-color: var(--color-paper-light);
    padding: var(--space-lg);
    transition: var(--transition);
  }
</style>
```

### Benefits

1. **Self-contained components**: Everything about a component in one file
2. **No specificity wars**: Svelte's scoping prevents conflicts
3. **Automatic dead code elimination**: Unused component = unused CSS
4. **Clear boundaries**: When working on Modal.svelte, all modal styles are right there
5. **Performance**: Only load CSS for components actually used

### Patterns

#### Design Token Usage
Always use CSS variables for values that appear in multiple places:
- Colors: `var(--color-primary)`
- Spacing: `var(--space-sm)`, `var(--space-md)`, etc.
- Transitions: `var(--transition)`

#### Mobile Responsiveness
Each component handles its own responsive styles:
```css
@media (max-width: 768px) {
  .component-class {
    /* Mobile-specific styles */
  }
}
```

#### State Management
Component state reflected through CSS classes:
```svelte
<div class="save-indicator {$saveStatus}">
```

### Migration Notes

When migrating from global CSS to component styles:
1. Identify all selectors related to a component
2. Move them to the component's `<style>` block
3. Remove any unnecessary parent selectors (Svelte scopes for you)
4. Ensure design tokens are used instead of hard-coded values

## Package Management

### Bun as Exclusive Package Manager

This project uses **Bun** exclusively as the package manager and runtime. Never use npm, yarn, or other package managers.

**Why Bun?**
- **Performance**: Significantly faster than npm for installs and script execution
- **Simplicity**: Single tool for package management, runtime, and bundling
- **Compatibility**: Drop-in replacement for npm with better performance
- **Modern**: Built for modern JavaScript/TypeScript development

**Development Commands**:
```bash
# Install dependencies
bun install

# Run development server  
bun run dev

# Build for production
bun run build

# Run tests
bun test

# Run linting
bun run lint

# Type checking
bun run check
```

**Project Setup Rules**:
- Always use `bun install` instead of `npm install`
- Use `bun run <script>` instead of `npm run <script>`
- Use `bunx` instead of `npx` for running packages
- Lock file: `bun.lock` (never `package-lock.json` or `yarn.lock`)

**For Contributors**:
If you don't have Bun installed:
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
```

This ensures consistent, fast development experience across all contributors and deployment environments.