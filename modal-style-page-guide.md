# How to Make a Full Page Look Like a Modal (Unsplash Style)

This guide shows how to create a full page route that visually appears as a modal overlay, similar to Unsplash's design.

## Key Principles

1. **Full page navigation** (React Router route)
2. **Modal-like styling** (dark backdrop, centered content)
3. **Smooth transitions** (fade in/out animations)
4. **Close button** that navigates back

---

## Implementation

### 1. Page Component Structure

```tsx
// PhotoDetailPage.tsx
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './PhotoDetailPage.css';

function PhotoDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const handleClose = () => {
    navigate(-1); // Go back, or navigate('/') to go home
  };

  return (
    <div className="modal-style-page">
      {/* Dark backdrop overlay */}
      <div className="modal-style-backdrop" onClick={handleClose} />
      
      {/* Main content container */}
      <div className="modal-style-container">
        {/* Close button */}
        <button className="modal-style-close" onClick={handleClose}>
          ✕
        </button>
        
        {/* Your content here */}
        <div className="modal-style-content">
          <h1>Photo Detail</h1>
          <p>Slug: {slug}</p>
          {/* Image, metadata, etc. */}
        </div>
      </div>
    </div>
  );
}

export default PhotoDetailPage;
```

### 2. CSS Styling

```css
/* PhotoDetailPage.css */

/* Main container - covers entire viewport */
.modal-style-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.3s ease-out;
}

/* Dark backdrop overlay */
.modal-style-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85); /* Dark backdrop like Unsplash */
  backdrop-filter: blur(4px); /* Optional: blur effect */
  z-index: 1;
}

/* Main content container - white background, centered */
.modal-style-container {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1400px; /* Adjust to your needs */
  height: 90vh;
  max-height: 900px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

/* Content area - scrollable */
.modal-style-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* Close button - top right corner */
.modal-style-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #333;
  z-index: 10;
  transition: background 0.2s, transform 0.2s;
}

.modal-style-close:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.1);
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .modal-style-page {
    padding: 0;
  }
  
  .modal-style-container {
    width: 100%;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }
  
  .modal-style-close {
    top: 12px;
    right: 12px;
    width: 36px;
    height: 36px;
  }
}
```

### 3. Full-Width Variant (Like Unsplash)

If you want the content to take full width/height (no rounded corners):

```css
/* Full-width modal style */
.modal-style-container.full-width {
  width: 100%;
  height: 100vh;
  max-width: 100%;
  max-height: 100vh;
  border-radius: 0;
  margin: 0;
}

.modal-style-page.full-width {
  padding: 0;
}
```

### 4. With Sidebar (Like Unsplash)

```tsx
function PhotoDetailPage() {
  return (
    <div className="modal-style-page">
      <div className="modal-style-backdrop" onClick={handleClose} />
      
      {/* Left sidebar */}
      <div className="modal-style-sidebar">
        <button className="sidebar-icon">🏠</button>
        <button className="sidebar-icon">📥</button>
        <button className="sidebar-icon">🔖</button>
        {/* More icons */}
      </div>
      
      {/* Main content */}
      <div className="modal-style-container">
        {/* Content */}
      </div>
    </div>
  );
}
```

```css
.modal-style-sidebar {
  position: relative;
  z-index: 2;
  width: 56px;
  height: 100vh;
  background: rgba(255, 255, 255, 0.95);
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  gap: 16px;
}

.sidebar-icon {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: background 0.2s;
}

.sidebar-icon:hover {
  background: rgba(0, 0, 0, 0.05);
}
```

### 5. Exit Animation

Add exit animation when navigating away:

```tsx
import { useState } from 'react';

function PhotoDetailPage() {
  const [isExiting, setIsExiting] = useState(false);
  const navigate = useNavigate();

  const handleClose = () => {
    setIsExiting(true);
    // Wait for animation to complete
    setTimeout(() => {
      navigate(-1);
    }, 300);
  };

  return (
    <div className={`modal-style-page ${isExiting ? 'exiting' : ''}`}>
      {/* ... */}
    </div>
  );
}
```

```css
.modal-style-page.exiting {
  animation: fadeOut 0.3s ease-out forwards;
}

.modal-style-container.exiting {
  animation: slideDown 0.3s ease-out forwards;
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes slideDown {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(20px);
    opacity: 0;
  }
}
```

### 6. Keyboard Support

```tsx
import { useEffect } from 'react';

function PhotoDetailPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate(-1);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [navigate]);

  // ... rest of component
}
```

### 7. Prevent Body Scroll

```tsx
import { useEffect } from 'react';

function PhotoDetailPage() {
  useEffect(() => {
    // Lock body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      // Restore scroll when component unmounts
      document.body.style.overflow = '';
    };
  }, []);

  // ... rest of component
}
```

---

## Complete Example (Unsplash-Style)

```tsx
// PhotoDetailPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './PhotoDetailPage.css';

function PhotoDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => navigate(-1), 300);
  };

  // Keyboard support
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className={`modal-style-page ${isExiting ? 'exiting' : ''}`}>
      {/* Dark backdrop */}
      <div 
        className="modal-style-backdrop" 
        onClick={handleClose}
        aria-label="Close modal"
      />
      
      {/* Left sidebar */}
      <div className="modal-style-sidebar">
        <button className="sidebar-icon" aria-label="Home">🏠</button>
        <button className="sidebar-icon" aria-label="Download">📥</button>
        <button className="sidebar-icon" aria-label="Bookmark">🔖</button>
      </div>
      
      {/* Main container */}
      <div className={`modal-style-container ${isExiting ? 'exiting' : ''}`}>
        {/* Close button */}
        <button 
          className="modal-style-close" 
          onClick={handleClose}
          aria-label="Close"
        >
          ✕
        </button>
        
        {/* Content */}
        <div className="modal-style-content">
          <h1>Photo: {slug}</h1>
          {/* Your photo and metadata here */}
        </div>
      </div>
    </div>
  );
}

export default PhotoDetailPage;
```

```css
/* PhotoDetailPage.css */
.modal-style-page {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  animation: fadeIn 0.3s ease-out;
}

.modal-style-page.exiting {
  animation: fadeOut 0.3s ease-out forwards;
}

.modal-style-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 1;
}

.modal-style-sidebar {
  position: relative;
  z-index: 2;
  width: 56px;
  background: rgba(255, 255, 255, 0.95);
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  gap: 16px;
}

.modal-style-container {
  position: relative;
  z-index: 2;
  flex: 1;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

.modal-style-container.exiting {
  animation: slideDown 0.3s ease-out forwards;
}

.modal-style-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
}

.modal-style-close:hover {
  background: #ffffff;
  transform: scale(1.1);
}

.modal-style-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideDown {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(20px);
    opacity: 0;
  }
}
```

---

## Key Differences from True Modal

| Aspect | True Modal (Overlay) | Modal-Style Page |
|--------|---------------------|------------------|
| **Navigation** | Same route, modal state | Full route change |
| **URL** | Same URL or query param | New URL (`/photos/:slug`) |
| **Back Button** | Closes modal | Navigates to previous page |
| **SEO** | Not indexable | Fully indexable |
| **Share** | Can't share direct link | Shareable URL |
| **Background** | Grid visible behind | Full page replacement |

---

## Benefits of Modal-Style Page

1. ✅ **SEO-friendly** - Each photo has its own URL
2. ✅ **Shareable** - Direct links to specific photos
3. ✅ **Browser history** - Back button works naturally
4. ✅ **Bookmarkable** - Users can bookmark specific photos
5. ✅ **Visual consistency** - Looks like a modal but acts like a page

---

## Tips

1. **Use React Router** for navigation
2. **Add exit animations** for smooth transitions
3. **Lock body scroll** when modal is open
4. **Support keyboard** (Escape to close)
5. **Make backdrop clickable** to close
6. **Use proper z-index** layering
7. **Test on mobile** - may want full-screen on small devices

This approach gives you the best of both worlds: the visual appeal of a modal with the benefits of proper page navigation!

