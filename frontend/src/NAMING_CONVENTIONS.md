# Naming Conventions

This document defines the naming conventions used in the frontend codebase.

## Files

### React Components
- **Format:** `PascalCase.tsx`
- **Examples:** `Header.tsx`, `ImageModal.tsx`, `MasonryGrid.tsx`

### React Hooks
- **Format:** `camelCase.ts` starting with `use`
- **Examples:** `useImageModal.ts`, `useMasonry.ts`, `useErrorHandler.ts`

### Utilities/Helpers
- **Format:** `camelCase.ts`
- **Examples:** `errorHandler.ts`, `downloadService.ts`, `lruCache.ts`

### Types
- **Format:** `camelCase.ts`
- **Examples:** `image.ts`, `collection.ts`, `store.ts`

### Config Files
- **Format:** `camelCase.ts`
- **Examples:** `appConfig.ts`, `timingConfig.ts`, `searchConfig.ts`

### CSS Files
- **Format:** Match the component name `PascalCase.css`
- **Examples:** `Header.css`, `ImageModal.css`, `MasonryGrid.css`

### CSS Module Files (if used)
- **Format:** `ComponentName.module.css`

## Folders

### Component Folders (containing multiple related files)
- **Format:** `PascalCase`
- **Examples:** `SearchBar/`, `ImageGrid/`
- Contains: Component file, hooks folder, index.ts

### Feature/Domain Folders
- **Format:** `lowercase`
- **Examples:** `hooks/`, `utils/`, `services/`, `stores/`, `types/`, `config/`

### Sub-component Folders
- **Format:** `lowercase`
- **Examples:** `components/image/hooks/`, `pages/admin/components/`

## Exports

### Index Files
- Each component folder should have an `index.ts` that exports the main component
- Example:
  ```typescript
  // SearchBar/index.ts
  export { SearchBar, type SearchBarRef } from './SearchBar';
  ```

### Named Exports vs Default Exports
- **Components:** Prefer default export for main component
- **Hooks/Utils:** Prefer named exports
- **Types:** Always use named exports

## Examples

### Component Folder Structure
```
components/
├── SearchBar/                 # PascalCase folder for component with submodules
│   ├── SearchBar.tsx         # Main component
│   ├── SearchSuggestions.tsx # Sub-component
│   ├── hooks/                # lowercase subfolder
│   │   ├── useSearchHistory.ts
│   │   └── index.ts
│   └── index.ts              # Re-exports
├── Header.tsx                # Simple component (no folder needed)
├── Header.css
└── image/                    # lowercase for feature grouping
    ├── hooks/
    │   └── useImageModal.ts
    └── ImageModalContent.tsx
```

### Page Folder Structure
```
pages/
├── HomePage.tsx
├── HomePage.css
├── ImageGrid/                # PascalCase for multi-file page
│   ├── ImageGrid.tsx
│   ├── hooks/
│   │   ├── useImageGridState.ts
│   │   └── index.ts
│   └── index.ts
└── admin/                    # lowercase for feature grouping
    ├── AdminPage.tsx
    ├── AdminPage.css
    └── components/
        └── tabs/
```

## Migration Notes

The codebase is being gradually migrated to follow these conventions. Some legacy patterns may still exist:

1. **`image/` folder** - lowercase because it's a feature grouping, not a component
2. **`SearchBar/` folder** - PascalCase because it's a component with submodules
3. **`ui/` folder** - lowercase because it contains multiple unrelated UI primitives

When adding new code, follow these conventions. When modifying existing code, consider updating the naming to match if the change is straightforward.

