# What Happens When You Refresh While Modal is Open?

## Current Behavior

When you refresh the page while a modal is open, here's what happens:

### Step-by-Step Flow

1. **Initial Click from Grid**:
   ```
   User clicks image → sessionStorage.setItem('imagePageFromGridKey', 'true')
   → Navigate to /photos/:slug with state: { fromGrid: true }
   → Modal opens (grid visible behind)
   ```

2. **Page Refresh (F5 or Ctrl+R)**:
   ```
   Browser refreshes → React Router state is lost
   → sessionStorage flag still exists: 'imagePageFromGridKey' = 'true'
   → ImagePage component mounts
   → getInitialFromGrid() runs:
      - Checks location.state?.fromGrid → undefined (lost on refresh)
      - Checks sessionStorage → 'true' (still exists)
      - Sets isFromGrid = true
      - Clears sessionStorage flag immediately
   → renderAsPage = false
   → Modal mode (but without grid behind - full page)
   ```

3. **Second Refresh**:
   ```
   Browser refreshes again
   → sessionStorage flag is now cleared (was cleared on first refresh)
   → getInitialFromGrid() runs:
      - Checks location.state?.fromGrid → undefined
      - Checks sessionStorage → null (cleared)
      - Sets isFromGrid = false
   → renderAsPage = true
   → Modal-style page (dark backdrop, centered container) ✅
   ```

## The Issue

**Problem**: On the first refresh, it still thinks it's in "modal mode" even though:
- The grid is no longer visible (full page reload)
- Navigation state is lost
- It should be modal-style page

**Why**: The sessionStorage flag persists across refreshes, so the first refresh still detects "from grid" mode.

## Expected vs Actual Behavior

| Action | Expected | Actual | Issue |
|--------|----------|--------|-------|
| Click from grid | Modal mode | Modal mode | ✅ Correct |
| **First refresh** | **Modal-style page** | **Modal mode** | ❌ Wrong |
| Second refresh | Modal-style page | Modal-style page | ✅ Correct |

## Solution: Fix the Refresh Behavior

The logic should treat a refresh as a "direct access" (modal-style page), not modal mode. Here's the fix:

### Option 1: Don't Use sessionStorage for Refresh Detection

Only use `location.state` which is lost on refresh:

```typescript
const getInitialFromGrid = () => {
  // Only check location.state (lost on refresh = direct access)
  const hasState = location.state?.fromGrid === true;
  
  // Don't check sessionStorage - it persists across refreshes
  // sessionStorage should only be used for mobile navigation, not refresh detection
  
  return hasState; // If no state, it's a refresh/direct access
};
```

### Option 2: Clear Flag on Page Load

Clear the sessionStorage flag immediately on page load, before checking:

```typescript
const getInitialFromGrid = () => {
  // Check location.state first (most reliable)
  const hasState = location.state?.fromGrid === true;
  
  // Check and immediately clear sessionStorage
  const fromGridFlag = sessionStorage.getItem(appConfig.storage.imagePageFromGridKey);
  const hadFlag = fromGridFlag === 'true';
  
  // Clear immediately (don't wait)
  if (fromGridFlag === 'true') {
    sessionStorage.removeItem(appConfig.storage.imagePageFromGridKey);
  }
  
  // Only use flag if we also have state (both present = from grid)
  // If only flag exists (no state) = refresh, treat as direct access
  return hasState && hadFlag;
};
```

### Option 3: Use Performance Navigation API

Detect if it's a refresh:

```typescript
const getInitialFromGrid = () => {
  // Check if this is a page refresh
  const isRefresh = performance.navigation?.type === 1 || 
                    performance.getEntriesByType('navigation')[0]?.type === 'reload';
  
  // If it's a refresh, always treat as direct access (modal-style page)
  if (isRefresh) {
    // Clear any stale flags
    sessionStorage.removeItem(appConfig.storage.imagePageFromGridKey);
    return false; // renderAsPage = true → modal-style page
  }
  
  // Not a refresh - check normal navigation
  const hasState = location.state?.fromGrid === true;
  const fromGridFlag = sessionStorage.getItem(appConfig.storage.imagePageFromGridKey);
  
  if (fromGridFlag === 'true') {
    sessionStorage.removeItem(appConfig.storage.imagePageFromGridKey);
  }
  
  return hasState || fromGridFlag === 'true';
};
```

## Recommended Fix

I recommend **Option 1** - only use `location.state` for detection:

- ✅ Simple and reliable
- ✅ Refresh = no state = modal-style page (correct)
- ✅ Direct URL = no state = modal-style page (correct)
- ✅ Click from grid = has state = modal mode (correct)
- ✅ sessionStorage can still be used for mobile navigation if needed

## Current Workaround

If you want modal-style page on refresh right now:

1. **Refresh once** → Still modal mode (flag exists)
2. **Refresh again** → Modal-style page (flag cleared)

Or manually clear the flag:
```javascript
// In browser console
sessionStorage.removeItem('imagePageFromGridKey');
// Then refresh
```

## Summary

**Current behavior on refresh**:
- First refresh: Still modal mode (because sessionStorage flag exists)
- Second refresh: Modal-style page (flag was cleared)

**Expected behavior**:
- First refresh: Modal-style page (treat refresh as direct access)

The fix is to not rely on sessionStorage for refresh detection, only use `location.state` which is lost on refresh.

