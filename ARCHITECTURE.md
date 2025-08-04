# Scribex Writer Architecture

This document outlines the technical architecture and design decisions for the Scribex Writer project.

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