# Responsive Web Standards — PhotoCloud

> Tiêu chuẩn responsive cho toàn bộ dự án. Áp dụng ở vòng cuối, sau khi chức năng đạt.

---

## 1. Định nghĩa cốt lõi

**Trang responsive tốt = người dùng hoàn thành được việc trên mọi thiết bị.**

### Làm thế nào?
1. Đặt câu hỏi: "Người dùng có thể hoàn thành tác vụ chính không?" (đăng nhập, xem ảnh, gửi form)
2. Test thực tế trên thiết bị thật trước khi kết luận
3. Không chỉ nhìn screenshot — phải thao tác thật

### Cần làm gì?
- [ ] Xác định tác vụ chính của trang
- [ ] Đảm bảo mọi nút bấm được trên touch
- [ ] Đảm bảo form submit được trên mobile
- [ ] Đảm bảo nội dung đọc được không cần zoom

---

## 2. Breakpoints chuẩn

### Làm thế nào?

**Cách 1: Mobile-first (khuyên dùng)**
```css
/* Mặc định = mobile */
.card { width: 100%; }

/* Tablet trở lên */
@media (min-width: 768px) {
  .card { width: 50%; }
}

/* Desktop trở lên */
@media (min-width: 1024px) {
  .card { width: 33.33%; }
}
```

**Cách 2: Desktop-first**
```css
/* Mặc định = desktop */
.card { width: 33.33%; }

/* Tablet trở xuống */
@media (max-width: 1023px) {
  .card { width: 50%; }
}

/* Mobile */
@media (max-width: 767px) {
  .card { width: 100%; }
}
```

### Cần làm gì?
- [ ] Đặt CSS custom properties cho breakpoint
- [ ] Viết breakpoint theo một hướng nhất quán (mobile-first)
- [ ] Test tại các điểm: 375px, 640px, 768px, 1024px, 1280px, 1440px
- [ ] Không hardcode pixel value trong component

```css
:root {
  --bp-mobile: 640px;
  --bp-tablet: 768px;
  --bp-desktop: 1024px;
  --bp-wide: 1280px;
}
```

---

## 3. Layout & Bố cục

### Làm thế nào?

**Container linh hoạt:**
```css
.container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding-left: 16px;
  padding-right: 16px;
}

@media (min-width: 768px) {
  .container {
    padding-left: 24px;
    padding-right: 24px;
  }
}

@media (min-width: 1024px) {
  .container {
    padding-left: 48px;
    padding-right: 48px;
  }
}
```

**Grid thích ứng:**
```css
.grid {
  display: grid;
  grid-template-columns: 1fr; /* Mobile: 1 cột */
  gap: 12px;
}

@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr); /* 2 cột */
    gap: 16px;
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(4, 1fr); /* 4 cột */
    gap: 24px;
  }
}
```

**Chống cuộn ngang:**
```css
/* Luôn đặt ở root elements */
html, body {
  overflow-x: hidden;
}

/* Container không gây tràn */
.container {
  overflow-x: hidden;
  max-width: 100vw;
}
```

### Cần làm gì?
- [ ] Thay `width: 1200px` bằng `max-width: 1200px`
- [ ] Thay `position: absolute` với pixel cố định bằng relative/flex
- [ ] Thay `left: 200px` bằng `left: 50%; transform: translateX(-50%)`
- [ ] Kiểm tra từng trang với DevTools ở 375px - không có scroll ngang
- [ ] Test overflow với nội dung dài bất thường

---

## 4. Touch Targets (Vùng bấm)

### Làm thế nào?

**CSS cho tất cả nút:**
```css
button,
.btn,
.btn-primary,
.btn-secondary,
.icon-btn {
  min-height: 44px;
  min-width: 44px;
  padding: 10px 16px;
  cursor: pointer;
}

/* Icon-only button cần wrapper đủ lớn */
.icon-btn-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
}
```

**HTML đúng:**
```html
<!-- Đúng: icon trong wrapper 44x44 -->
<button class="icon-btn-wrapper" aria-label="Đóng">
  <XIcon size={20} />
</button>

<!-- Sai: icon không có wrapper -->
<button style="padding: 4px;">
  <XIcon size={20} />
</button>
```

### Cần làm gì?
- [ ] Dùng DevTools đo tất cả nút — phải ≥ 44x44px
- [ ] Icon-only buttons bắt buộc có `aria-label`
- [ ] Khoảng cách giữa các nút liền kề ≥ 8px
- [ ] Test: tap một nút, không nhầm sang nút khác
- [ ] Checkbox/radio nhỏ → wrap trong label đủ lớn

```html
<!-- Checkbox touch-friendly -->
<label style="display: flex; align-items: center; min-height: 44px; cursor: pointer;">
  <input type="checkbox" style="width: 20px; height: 20px;" />
  <span>Đồng ý với điều khoản</span>
</label>
```

---

## 5. Typography

### Làm thế nào?

**Font scale linh hoạt:**
```css
:root {
  --font-size-base: 16px;
  --line-height-base: 1.5;
  
  /* Heading scale */
  --font-size-h1: 1.75rem;  /* 28px mobile */
  --font-size-h2: 1.375rem; /* 22px mobile */
  --font-size-h3: 1.125rem;  /* 18px mobile */
}

@media (min-width: 1024px) {
  :root {
    --font-size-h1: 2.5rem;   /* 45px desktop */
    --font-size-h2: 2rem;     /* 36px desktop */
    --font-size-h3: 1.5rem;   /* 27px desktop */
  }
}

body {
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
}

h1 { font-size: var(--font-size-h1); }
h2 { font-size: var(--font-size-h2); }
h3 { font-size: var(--font-size-h3); }
```

**Chống iOS zoom:**
```css
/* Quan trọng: ngăn iOS zoom khi focus input */
input, select, textarea {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
```

### Cần làm gì?
- [ ] Set `font-size: 16px` làm base
- [ ] Heading nhỏ hơn trên mobile, scale up trên desktop
- [ ] Line-height đủ để đọc: 1.5–1.6 mobile, 1.6–1.75 desktop
- [ ] Không dùng `font-size: 14px` cho body
- [ ] Test trên iOS — focus vào input không được zoom

---

## 6. Images & Media

### Làm thế nào?

**Ảnh responsive:**
```html
<!-- Thumbnail grid -->
<img 
  src="image-400.jpg"
  srcset="
    image-400.jpg 400w,
    image-800.jpg 800w,
    image-1200.jpg 1200w
  "
  sizes="(max-width: 639px) 100vw,
         (max-width: 1023px) 50vw,
         25vw"
  alt="Mô tả ảnh"
  loading="lazy"
  decoding="async"
  width="400"
  height="300"
/>
```

**Picture với format:**
```html
<picture>
  <source 
    type="image/webp"
    srcset="image-400.webp 400w, image-800.webp 800w"
    sizes="..."
  />
  <img 
    src="image-400.jpg"
    srcset="..."
    sizes="..."
    alt="..."
    loading="lazy"
  />
</picture>
```

**Video responsive:**
```css
.video-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
}

.video-container iframe,
.video-container video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
```

### Cần làm gì?
- [ ] Ảnh trên đầu trang: không `loading="lazy"`
- [ ] Ảnh dưới màn hình: `loading="lazy"`
- [ ] Luôn đặt `width` và `height` để tránh layout shift
- [ ] Dùng WebP khi hỗ trợ trình duyệt
- [ ] Compress ảnh: target < 100KB cho thumbnail, < 500KB cho ảnh lớn
- [ ] Check LCP (Largest Contentful Paint) — ảnh hero phải load nhanh

---

## 7. Navigation

### Làm thế nào?

**Hamburger menu mobile:**
```tsx
// MobileMenu.tsx
const MobileMenu = ({ isOpen, onClose }: Props) => {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="menu-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Menu panel */}
      <nav 
        className={`mobile-nav ${isOpen ? 'open' : ''}`}
        aria-label="Menu chính"
        aria-hidden={!isOpen}
      >
        <ul>
          <li><a href="/" onClick={onClose}>Trang chủ</a></li>
          <li><a href="/gallery" onClick={onClose}>Bộ sưu tập</a></li>
          <li><a href="/about" onClick={onClose}>Giới thiệu</a></li>
        </ul>
      </nav>
    </>
  );
};
```

**CSS:**
```css
.mobile-nav {
  position: fixed;
  top: 0;
  right: 0;
  width: 280px;
  height: 100vh;
  background: white;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 1000;
  padding: 80px 24px 24px;
}

.mobile-nav.open {
  transform: translateX(0);
}

.menu-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 999;
}
```

**Focus trap:**
```tsx
useEffect(() => {
  if (!isOpen) return;
  
  const focusableElements = menuRef.current?.querySelectorAll(
    'a, button, input, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstEl = focusableElements?.[0];
  const lastEl = focusableElements?.[focusableElements.length - 1];
  
  const handleTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === firstEl) {
      e.preventDefault();
      lastEl?.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      firstEl?.focus();
    }
  };
  
  document.addEventListener('keydown', handleTab);
  firstEl?.focus();
  
  return () => document.removeEventListener('keydown', handleTab);
}, [isOpen]);
```

### Cần làm gì?
- [ ] Hamburger icon: 44x44px, `aria-label="Mở menu"`
- [ ] Menu đóng khi tap backdrop
- [ ] Menu đóng khi click link bên trong
- [ ] Focus trap khi menu mở
- [ ] Nút đóng (X) có `aria-label="Đóng menu"`
- [ ] Keyboard: Tab di chuyển trong menu, Escape đóng
- [ ] Body scroll lock khi menu mở

---

## 8. Forms & Inputs

### Làm thế nào?

**CSS cơ bản:**
```css
.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 14px;
}

.form-input {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  font-size: 16px; /* Quan trọng cho iOS */
  border: 1px solid #ccc;
  border-radius: 8px;
  box-sizing: border-box;
}

.form-input:focus {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}

.form-input.error {
  border-color: #dc3545;
}

.form-error {
  display: block;
  margin-top: 4px;
  color: #dc3545;
  font-size: 12px;
}
```

**HTML:**
```html
<div class="form-group">
  <label for="email" class="form-label">Email</label>
  <input 
    type="email" 
    id="email" 
    name="email"
    class="form-input"
    placeholder="you@example.com"
    aria-describedby="email-error"
    required
  />
  <span id="email-error" class="form-error" role="alert">
    Vui lòng nhập email hợp lệ
  </span>
</div>
```

### Cần làm gì?
- [ ] Label luôn hiển thị (không dùng placeholder thay label)
- [ ] Input ≥ 44px height
- [ ] Font-size ≥ 16px (chống iOS zoom)
- [ ] Error message gắn với field qua `aria-describedby`
- [ ] Focus ring rõ ràng
- [ ] Submit button không bị che bởi bàn phím ảo
- [ ] Disable state có `aria-disabled` hoặc `disabled`

---

## 9. Modal / Dialog

### Làm thế nào?

**React Modal:**
```tsx
const Modal = ({ isOpen, onClose, title, children }: Props) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    
    // Focus trap
    if (e.key === 'Tab') {
      const focusable = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      
      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;
      
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button 
            onClick={onClose}
            aria-label="Đóng"
            className="modal-close"
          >
            <XIcon />
          </button>
        </header>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};
```

**CSS:**
```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  outline: none;
}

/* Mobile: full-screen */
@media (max-width: 639px) {
  .modal-overlay {
    padding: 0;
    align-items: flex-end;
  }
  
  .modal-content {
    max-width: 100%;
    max-height: 95vh;
    border-radius: 12px 12px 0 0;
  }
}
```

### Cần làm gì?
- [ ] Focus vào modal khi mở
- [ ] Trả focus về trigger khi đóng
- [ ] Escape đóng modal
- [ ] Click backdrop đóng modal
- [ ] Focus trap trong modal
- [ ] `aria-modal="true"`, `role="dialog"`
- [ ] Body scroll lock khi modal mở
- [ ] Mobile: consider full-screen hoặc bottom sheet

---

## 10. Kiểm tra thực tế

### Làm thế nào?

**DevTools Chrome:**
1. Mở DevTools (`F12`)
2. Toggle device toolbar (`Cmd+Shift+M` / `Ctrl+Shift+M`)
3. Chọn device: iPhone 12, iPad, Responsive
4. Test các breakpoint: 375, 640, 768, 1024, 1280, 1440px

**Keyboard-only navigation:**
1. Tab qua tất cả interactive elements
2. Enter/Space activate buttons
3. Escape đóng modal/menu
4. Arrow keys trong dropdown/menu

**prefers-reduced-motion:**
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**prefers-color-scheme:**
```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #121212;
    --text-primary: #ffffff;
  }
}
```

### Checklist kiểm tra

#### Desktop (≥ 1024px)
- [ ] 1280px — layout đẹp
- [ ] 1440px — layout đẹp
- [ ] 1920px — không tràn

#### Tablet (768px – 1023px)
- [ ] 768px (iPad) — scroll mượt
- [ ] 800px — navigation hoạt động

#### Mobile (≤ 767px)
- [ ] 375px (iPhone SE) — mọi thứ vừa
- [ ] 390px (iPhone 12/13) — mọi thứ vừa
- [ ] 428px (iPhone 14 Pro Max) — mọi thứ vừa
- [ ] 360px (Android nhỏ) — test worst-case

#### Orientation
- [ ] Landscape trên mobile
- [ ] Landscape trên tablet

#### Keyboard
- [ ] Tab navigation hoàn chỉnh
- [ ] Focus visible trên mọi element
- [ ] Enter/Space activate
- [ ] Escape close

#### Touch
- [ ] Tap accuracy — không tap nhầm
- [ ] Swipe/scroll mượt
- [ ] Bàn phím ảo không che nút

---

## 11. Lỗi thường gặp & cách tránh

### Width cứng
```css
/* Sai */
.sidebar { width: 300px; }

/* Đúng */
.sidebar { 
  width: 100%; 
  max-width: 300px; 
}
```

### Font < 16px
```css
/* Sai */
body { font-size: 14px; }
input { font-size: 14px; } /* iOS zoom! */

/* Đúng */
body { font-size: 16px; }
input { font-size: 16px; }
```

### Touch target quá nhỏ
```css
/* Sai */
.close-btn { padding: 2px; width: 16px; height: 16px; }

/* Đúng */
.close-btn { 
  padding: 10px; 
  min-width: 44px; 
  min-height: 44px; 
}
```

### Dropdown hover-only
```tsx
// Sai: không hoạt động trên touch
<select onMouseEnter={open}>

// Đúng: hover + click
<div 
  onMouseEnter={open}
  onClick={toggle} // Touch-friendly
  onKeyDown={(e) => e.key === 'Enter' && toggle()}
  role="button"
  tabIndex={0}
>
```

### Ảnh không lazy
```html
<!-- Sai: 100 ảnh load cùng lúc -->
<img src="thumb.jpg" />

<!-- Đúng: lazy-load ảnh dưới màn hình -->
<img src="thumb.jpg" loading="lazy" />

<!-- Hero image: eager (mặc định) -->
<img src="hero.jpg" />  <!-- Không có loading="lazy" -->
```

### Fixed header che nội dung
```css
/* Sai */
body { padding-top: 60px; } /* Hardcode */

/* Đúng */
html { scroll-padding-top: 80px; }
.modal-content { scroll-padding-top: 80px; }
```

### Focus ring bị ẩn
```css
/* Sai */
*:focus { outline: none; }

/* Đúng */
*:focus-visible { 
  outline: 2px solid #007bff; 
  outline-offset: 2px; 
}

/* Vẫn hỗ trợ keyboard focus */
*:focus { 
  outline: 2px solid #007bff; 
  outline-offset: 2px; 
}
```

---

## Checklist trước khi mark responsive đạt

### Trước khi test
- [ ] Hoàn thành chức năng (không đánh responsive trong vòng chức năng)
- [ ] Code không có width/height cứng (px) ở layout chính
- [ ] Tất cả nút ≥ 44x44px
- [ ] Font-size body ≥ 16px

### Test thiết bị
- [ ] Desktop: 1280px, 1440px
- [ ] Tablet: 768px (iPad)
- [ ] Mobile: 375px (iPhone SE), 390px (iPhone 12/13), 428px (iPhone 14 Pro Max)
- [ ] **Ít nhất 1 thiết bị thật** (không chỉ DevTools)

### Test chức năng
- [ ] Navigation mở/đóng trên mobile
- [ ] Form submit trên mobile
- [ ] Modal mở/đóng trên mobile
- [ ] Keyboard navigation hoạt động
- [ ] Không cuộn ngang
- [ ] Bàn phím ảo không che nút submit

### Ghi nhận kết quả
- [ ] Ghi rõ trình duyệt (Chrome 119, Safari iOS 17, etc.)
- [ ] Ghi rõ viewport (375x812 iPhone 14)
- [ ] Ghi rõ thiết bị thật hay giả lập
- [ ] Ghi rõ điều kiện test (light/dark mode, prefers-reduced-motion)

---

*Nguồn: AGENTS.md — Tiêu chuẩn Responsive vòng cuối, WCAG 2.1 SC 2.5.5, Apple HIG, Google Material Design*
