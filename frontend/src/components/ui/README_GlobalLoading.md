# Global Loading System

## Overview

A unified loading system that shows a **single spinner** for the entire app, replacing multiple individual spinners across different pages and components.

## Benefits

✅ **Single spinner** - No more multiple spinners appearing simultaneously  
✅ **Consistent UX** - Same loading experience everywhere  
✅ **No layout shifts** - Fixed positioning prevents jumping  
✅ **Centralized control** - Easy to manage and debug  

## Architecture

### 1. Global Loading Store (`useGlobalLoadingStore.ts`)
- Tracks loading states from all stores/components
- Provides single source of truth for "is anything loading?"

### 2. Global Loading Overlay (`GlobalLoadingOverlay.tsx`)
- Single spinner component shown at app level
- Appears when ANY store is loading
- Smooth fade in/out transitions

### 3. Sync Helper (`syncGlobalLoading.ts`)
- Helper function to sync store loading states
- Stores call this when loading state changes

## Usage

### In Stores

```typescript
import { syncGlobalLoading } from './helpers/syncGlobalLoading';

// When setting loading to true (only when no data to show)
set((draft) => {
  if (draft.images.length === 0) {
    draft.loading = true;
    syncGlobalLoading('imageStore', true);  // Register with global store
  }
});

// When setting loading to false
set((draft) => {
  draft.loading = false;
  syncGlobalLoading('imageStore', false);  // Unregister
});
```

### In Components

```typescript
import { useGlobalLoading } from '@/stores/useGlobalLoadingStore';

function MyComponent() {
  const [loading, setLoading] = useState(false);
  
  // Automatically syncs with global store
  useGlobalLoading('myComponent', loading);
  
  // ... rest of component
}
```

## Integration Status

✅ **useImageStore** - Integrated  
⏳ **useUserImageStore** - TODO  
⏳ **useCollectionsListStore** - TODO  
⏳ **useCollectionStore** - TODO  
⏳ **useProfileStore** - TODO  
⏳ **useFavoriteStore** - TODO  

## Migration Guide

### Before (Multiple Spinners)
```tsx
// Each page had its own spinner
{loading && images.length === 0 && (
  <LoadingSpinner size="large" />
)}
```

### After (Single Global Spinner)
```tsx
// Store automatically syncs with global store
// GlobalLoadingOverlay in App.tsx shows spinner
// No need for individual spinners!
```

## Important Notes

- **Only show when no data**: Global spinner should only appear when there's no content to display
- **Keep existing content visible**: Don't show spinner if images/data already exist (prevents blocking UI)
- **Store-specific logic**: Each store decides when to register loading (e.g., only when images.length === 0)

