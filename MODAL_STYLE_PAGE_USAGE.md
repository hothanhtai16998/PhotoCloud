# How to Use Modal-Style Page

## Overview

The modal-style page automatically activates when users navigate directly to a photo page (not from the grid). It creates an Unsplash-style appearance with a dark backdrop and centered white container.

---

## Automatic Behavior

### When Modal-Style is Active

The modal-style page **automatically activates** when:

1. **Direct URL access**: User visits `/photos/:slug` directly
2. **Page refresh**: User refreshes the page while on a photo detail page
3. **Bookmark/Share link**: User opens a shared or bookmarked photo URL
4. **Browser back/forward**: User navigates via browser history

### When Modal-Style is NOT Active

The modal-style page **does NOT activate** when:

1. **Clicking from grid**: User clicks an image from the homepage/grid
2. **Modal mode**: The existing modal overlay is used instead

---

## How It Works

### Detection Logic

The page detects how the user arrived:

```typescript
// In ImagePage.tsx
const getInitialFromGrid = () => {
  // Check navigation state
  const hasState = location.state?.fromGrid === true;
  
  // Check sessionStorage flag
  const fromGridFlag = sessionStorage.getItem('imagePageFromGridKey');
  
  // If from grid, use modal mode
  // Otherwise, use modal-style page mode
  return hasState || fromGridFlag === 'true';
};
```

### Visual Differences

| Mode | Appearance | Backdrop | Container |
|------|-----------|----------|-----------|
| **Modal Mode** (from grid) | Overlay on grid | Semi-transparent | Centered, grid visible behind |
| **Modal-Style Page** (direct access) | Full page | Dark (85% opacity) | Centered white container |

---

## Testing the Feature

### Method 1: Direct URL Access

1. **Start your dev server**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Navigate directly to a photo**:
   ```
   http://localhost:5173/photos/your-image-slug-abc123
   ```

3. **You should see**:
   - Dark backdrop covering the entire viewport
   - Centered white container with rounded corners
   - Smooth fade-in animation
   - Sidebar on the left (desktop)

### Method 2: Refresh on Photo Page

1. **Click an image** from the grid (opens in modal mode)
2. **Refresh the page** (F5 or Ctrl+R)
3. **Modal-style activates** automatically

### Method 3: Share/Bookmark Link

1. **Copy the photo URL** from the address bar
2. **Open in new tab** or share with someone
3. **Modal-style activates** when the link is opened

---

## User Interactions

### Closing the Page

Users can close the modal-style page in several ways:

1. **Click backdrop**: Click the dark area around the container
2. **Escape key**: Press `Esc` on keyboard
3. **Close button**: Use the close button in the ImageModal component
4. **Browser back**: Click browser's back button

### Navigation

- **Between photos**: Click related images to navigate (stays in modal-style)
- **Back to home**: Close button or backdrop click navigates to `/`
- **Browser history**: Back/forward buttons work normally

---

## Customization

### Adjust Backdrop Opacity

Edit `frontend/src/pages/ImagePage.css`:

```css
.image-page-backdrop {
  background: rgba(0, 0, 0, 0.85); /* Change 0.85 to adjust opacity */
}
```

### Change Container Size

```css
.image-page-container.page-mode {
  max-width: 1400px; /* Adjust max width */
  height: 90vh; /* Adjust height */
  max-height: 900px; /* Adjust max height */
}
```

### Modify Border Radius

```css
.image-page-container.page-mode {
  border-radius: 12px; /* Change for more/less rounded corners */
}
```

### Adjust Animation Speed

```css
.image-page-wrapper.modal-style {
  animation: fadeIn 0.3s ease-out; /* Change 0.3s to adjust speed */
}

.image-page-container.page-mode {
  animation: slideUp 0.3s ease-out; /* Change 0.3s to adjust speed */
}
```

### Disable Blur Effect

```css
.image-page-backdrop {
  backdrop-filter: blur(4px); /* Remove or change blur amount */
}
```

---

## Mobile Behavior

On mobile devices (≤768px):

- **Full-width**: Container takes 100% width
- **Full-height**: Container takes 100vh
- **No rounded corners**: Border radius is 0
- **No sidebar**: Sidebar is hidden on mobile

---

## Code Structure

### Key Files

1. **`frontend/src/pages/ImagePage.tsx`**
   - Main component logic
   - Detection of navigation source
   - Exit animations
   - Keyboard support

2. **`frontend/src/pages/ImagePage.css`**
   - Modal-style styling
   - Animations
   - Responsive breakpoints

### Key Components

- **`image-page-wrapper`**: Outer container with backdrop
- **`image-page-backdrop`**: Dark overlay
- **`image-page-container.page-mode`**: White content container
- **`image-page-sidebar`**: Left sidebar (desktop only)

---

## Troubleshooting

### Modal-style Not Appearing

**Problem**: Page shows normal layout instead of modal-style

**Solutions**:
1. Check if you're coming from grid (modal mode takes precedence)
2. Clear sessionStorage: `sessionStorage.removeItem('imagePageFromGridKey')`
3. Refresh the page directly (F5)
4. Check browser console for errors

### Backdrop Not Clickable

**Problem**: Clicking backdrop doesn't close the page

**Solutions**:
1. Check z-index values in CSS
2. Ensure `onClick={handleClose}` is on backdrop
3. Check if another element is blocking clicks

### Animations Not Working

**Problem**: No fade/slide animations

**Solutions**:
1. Check CSS animations are defined
2. Verify `isExiting` state is working
3. Check browser supports CSS animations
4. Disable browser extensions that might block animations

### Sidebar Not Visible

**Problem**: Sidebar doesn't show on desktop

**Solutions**:
1. Check viewport width (sidebar shows at ≥768px)
2. Verify `renderAsPage` is true
3. Check sidebar component is rendered
4. Inspect CSS for display: none

---

## Best Practices

1. **Test both modes**: Always test modal mode (from grid) and modal-style page (direct access)
2. **Mobile testing**: Test on actual mobile devices, not just browser dev tools
3. **Performance**: Monitor animation performance on lower-end devices
4. **Accessibility**: Ensure keyboard navigation works (Escape key)
5. **SEO**: Modal-style pages are SEO-friendly (each photo has unique URL)

---

## Example Usage Flow

```
User Journey 1: From Grid
1. User on homepage → clicks image
2. Modal overlay opens (grid visible behind)
3. User refreshes page
4. Modal-style page activates (dark backdrop, centered container)

User Journey 2: Direct Access
1. User receives shared link: /photos/beautiful-sunset-abc123
2. User clicks link
3. Modal-style page opens immediately
4. Dark backdrop, centered white container
5. User can close via backdrop click or Escape key
```

---

## Summary

The modal-style page is **automatic** - no code changes needed to use it. Simply:

1. ✅ Navigate directly to `/photos/:slug`
2. ✅ Refresh on a photo page
3. ✅ Open a shared/bookmarked photo URL

The page will automatically show the Unsplash-style modal appearance with dark backdrop and centered white container!

