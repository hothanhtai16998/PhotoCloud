# PhotoCloud Studio — Brand & Product Checklist

> Cập nhật theo brief "PhotoCloud – Studio chụp ảnh theo yêu cầu" (10/2026).
> Tracking trạng thái: `[x]` đã có · `[~]` đang làm/done một phần · `[ ]` chưa có.

---

## 1. Định vị thương hiệu & bản sắc

- [x] Tên thương hiệu: **PhotoCloud** (đã có trong toàn bộ app).
- [x] Eyebrow "PhotoCloud Studio" trên hero (xem `HeroBooking.tsx:18`).
- [x] Tính cách: vừa là nền tảng ảnh (community), vừa là studio booking.
- [x] Phong cách hình ảnh: dùng ảnh Unsplash cinematic, fallback gradient warm.
- [~] Tagline "Chụp ảnh theo cách của bạn" — đã đặt ở hero (`HeroBooking.tsx:30`) nhưng cần kiểm tra đồng nhất ở `BookingPage`, `BookingModal`, meta title.
- [x] Tagline phụ "Kể chuyện bằng ánh sáng" — chưa dùng, có thể thêm ở About/Blog.

---

## 2. Bảng màu & Typography

> Tất cả token được khai báo tập trung trong `frontend/src/index.css:240-258` (block `:root`).
> Mục tiêu: ấm (warm ivory), cao cấp, riêng tư — phục vụ tone "Studio chụp ảnh theo yêu cầu".

### 2.1 Bảng màu (Color tokens)

| Nhóm | Token | Giá trị | Đã dùng ở đâu | Trạng thái |
|---|---|---|---|---|
| Nền chính | `--studio-bg-warm` | `#FAF8F4` | `HeroBooking.css:21-22` (gradient hero), `BookingPage` cần đối chiếu (đang `#f8f8f6`) | [~] áp dụng rải rác, **chưa đồng nhất ở `BookingPage`, `AboutPage`** |
| Nền phụ | `--studio-bg-cream` | `#F2EEE7` | `HeroBooking.css:21-22` (gradient), `index.css:906` (hero CTA phụ) | [~] đang hardcode, cần thay bằng `var(...)` |
| Nền card | `--studio-bg-card` | `#FFFFFF` | Card `.studio-card`, `BookingPage.css` | [x] OK |
| Text chính | `--studio-text-primary` | `#1B1B19` | Hero title, CTA, card heading | [~] **HeroBooking dùng hex trực tiếp** (`#1B1B19`) thay vì `var(...)` — sửa lại để token-driven |
| Text phụ | `--studio-text-muted` | `#6B6B66` | Mô tả, label phụ | [x] OK |
| Text "faint" | `--studio-text-faint` | `#8A6B2D` | Eyebrow gold-copper, `.studio-cta-ghost` | [x] OK |
| Viền nhẹ | `--studio-border-soft` | `#E8E2D6` | Card, input, hero card | [x] OK |
| Accent đồng | `--studio-accent-copper` | `#B8865B` | Eyebrow LED, focus ring, CTA icon | [x] OK |
| Accent đồng đậm | `--studio-accent-copper-dark` | `#9A6F49` | Hover gradient, focus outline CTA | [x] OK |
| Status Confirmed | `--studio-status-confirmed` | `#7A8B5C` (olive) | `AdminPage.css:353` `.booking-status-confirmed` | [x] **đã áp dụng** (dạng rgba `rgba(122,139,92,0.18)` + text `#4F5D38`) |
| Status Pending | `--studio-status-pending` | `#C9A14A` (amber) | `AdminPage.css:351` `.booking-status-pending` | [x] **đã áp dụng** (`rgba(201,161,74,0.16)` + `#8A6A1B`) |
| Status Danger | `--studio-status-danger` | `#A6453C` (terracotta) | `AdminPage.css:356-358` (rejected/cancelled) | [x] **đã áp dụng** (`rgba(166,69,60,0.14)` + `#8A2A23`) |
| Status review/reschedule | — (derived) | `#8A5A2A` (copper) | `.booking-status-reviewing`, `.booking-status-rescheduled` | [x] bổ sung, dùng tông copper |
| Status completed | — (derived) | `#1B1B19` neutral | `.booking-status-completed` | [x] bổ sung |
| Rating vàng | — (component) | `#C9A14A`/`#D9A441` | Star rating components | [x] OK (chưa token hóa, có thể thêm `--studio-rating-gold`) |
| Success text | — (inline) | `#5A6E44` | Hero "Đang nhận booking" badge | [~] nên chuyển thành `var(--studio-status-confirmed)`-based token |
| Slot urgency | — (inline) | `#A6453C`/`#6F2D26` | Hero slot counter (urgency) | [x] trùng với danger token, dùng tạm OK |

#### Hành động còn lại
- [x] **Refactor HeroBooking**: thay các hex inline (`#1B1B19`, `#FAF8F4`, `#F2EEE7`, `#B8865B`, ...) bằng `var(--studio-*)` để token-driven 100%.
- [x] **BookingPage.css**: đổi nền `#f8f8f6` → `var(--studio-bg-warm)`, text primary `#20211f` → `var(--studio-text-primary)`, viền input/divider → `var(--studio-border-soft)`.
- [x] **AboutPage.css**: thay nền `var(--bg-card, #FFFFFF)` → `var(--studio-bg-warm)`, áp token cho card/icon, dùng Fraunces cho `.about-title`/`.card-title`.
- [x] Thêm token `--studio-rating-gold` + `--studio-rating-gold-bright` để chuẩn hóa màu rating.

### 2.2 Typography

#### Font families (đã import)

| Token | Font | Nguồn | Fallback | Trạng thái |
|---|---|---|---|---|
| `--studio-font-display` | **Fraunces** (variable, opsz 9–144, wght 400–700) | `index.css:1` Google Fonts | `Playfair Display, Georgia, serif` | [x] import OK, dùng cho Hero h1 + Booking/About h1/h2 |
| `--studio-font-body` | **Inter** (400/500/600/700) | `index.css:1` Google Fonts | `Roboto, system-ui, -apple-system, sans-serif` | [x] import OK, **đã set cho `html, body` trong `index.css:115-122`** |
| Self-host | **Roboto** (variable, wght 100–900) | `index.css:48-65` | — | [x] OK (fallback thực tế khi Inter chưa load) |

#### Thang font (Type scale) — đề xuất chuẩn hóa

| Cấp | Size (px) | Line-height | Weight | Letter-spacing | Sử dụng |
|---|---|---|---|---|---|
| `display-xl` | clamp(48, 6vw, 72) | 1.04 | 500 | -0.04em | Hero h1, About hero |
| `display-lg` | clamp(36, 4.5vw, 52) | 1.08 | 500 | -0.03em | Booking h1, section h1 |
| `display-md` | clamp(28, 3vw, 36) | 1.15 | 500 | -0.02em | Modal h1, success h1 |
| `heading-lg` | 24 | 1.25 | 600 | -0.01em | Section h2 trong studio pages |
| `heading-md` | 20 | 1.3 | 600 | 0 | Section heading booking (`booking-section-heading h2`) |
| `heading-sm` | 17 | 1.35 | 600 | 0 | Card title (`booking-package-card strong`) |
| `body-lg` | 16 | 1.55 | 400 | 0 | Body chính, hero sub (đang 20px → cần check) |
| `body-md` | 14 | 1.5 | 400 | 0 | Input, description, mặc định body |
| `body-sm` | 13 | 1.45 | 400 | 0 | Card meta, ghi chú |
| `caption` | 12 | 1.4 | 500 | 0 | Eyebrow, label, helper |
| `overline` | 11 | 1.3 | 700 | 0.16em uppercase | `.booking-eyebrow`, `.hero-eyebrow` |

#### Quy tắc sử dụng font

| Ngữ cảnh | Font | Áp dụng | Trạng thái |
|---|---|---|---|
| `h1` Hero, Booking, About, Modal | Fraunces | `font-family: var(--studio-font-display)` | [x] **đã áp dụng**: Hero ✓, `BookingPage.css` ✓, `AboutPage.css` ✓, Booking success card ✓ |
| `h2` Section (About, Booking) | Fraunces | `font-family: var(--studio-font-display)` | [x] **đã áp dụng**: `.booking-section-heading h2` (22px, weight 500), `.booking-summary-card h2` (26px), `.card-title` About (clamp 24–30px) |
| Tiêu đề card | Inter SemiBold | Tailwind `font-semibold` (đã có) | [x] OK |
| Eyebrow / overline | Inter Bold uppercase 11–12px | `.booking-eyebrow`, `.hero-eyebrow` | [x] OK (đã chuẩn hóa 0.16em, 700, `--studio-text-faint`) |
| Body | Inter 400/500 | `html, body { font-family: var(--studio-font-body) }` | [x] **đã set trong `index.css:115-122`** (kèm `font-feature-settings: "ss01", "cv11"`, antialias) |
| Italic emphasis trong title (`em`) | Fraunces italic + gradient copper | `HeroBooking.css:274-282` | [x] OK |
| Rating star | Gold | `.studio-rating-star` (mới) | [x] OK — utility class với `--studio-rating-gold` |

#### Hành động còn lại
- [x] **Set body font**: thêm vào `index.css` rule `html, body { font-family: var(--studio-font-body); font-feature-settings: "ss01", "cv11"; }` để Inter được dùng thay cho Roboto.
- [x] **BookingPage.css**: thêm `font-family: var(--studio-font-display)` cho `.booking-hero h1`, `.booking-success-card h1`, `.booking-summary-card h2`.
- [x] **AboutPage.css**: thêm `font-family: var(--studio-font-display)` cho `.about-title` (clamp 36–52px) và `.card-title` (clamp 24–30px), tăng weight lên 500 (serif Fraunces không cần 700).
- [x] Tạo utility class `.studio-display { font-family: var(--studio-font-display); font-weight: 500; letter-spacing: -0.02em; }` (đã có ở `index.css:780` nhưng chưa áp cho h1) — dùng thay vì khai báo lặp.
- [x] Refactor: chuẩn hóa `.booking-eyebrow` dùng token spacing `0.16em`, font-weight 700, màu `--studio-text-faint`.

### 2.3 Tiêu chí đạt (Definition of Done)

- [x] Toàn bộ token màu + font family khai báo ở `index.css` (single source of truth).
- [x] 3 status chính (confirmed/pending/danger) đã có class `.booking-status-*` áp dụng trong `AdminPage.css`.
- [x] Hero h1 dùng Fraunces.
- [x] Body dùng Inter (set qua `index.css:115-122`).
- [x] Booking/About/Modal h1, h2 dùng Fraunces.
- [x] Tất cả trang branded dùng `--studio-bg-warm` làm nền (đồng nhất warm) — Hero ✓, Booking ✓, About ✓.
- [x] Không còn hex color nào trong `AboutPage.css` / `BookingPage.css` của trang public — Hero còn vài hex derived (gradient dừng, shadow) nhưng mọi màu chính đã qua `var(--studio-*)`.

---

## 3. Cấu trúc trang (Site Map)

> Toàn bộ route đăng ký tại `frontend/src/App.tsx:220-265` (public) + `:275-285` (auth).
> Mục tiêu brief: **trang khách công khai, trang thành viên sau đăng nhập, admin cho staff**.
> Cột "Thực tế" ghi đúng đường dẫn route đang có; cột "Brief" là đường dẫn lý tưởng trong tài liệu.

### 3.0 Đối chiếu Brief ↔ Thực tế

| Hạng mục | Brief | Thực tế | Ghi chú |
|---|---|---|---|
| Trang ảnh (URL) | `/photo/:id` | `/photos/:slug` | URL dùng **slug** (SEO), không phải Mongo `_id` — OK |
| Bộ sưu tập | `/collections/:id` | `/collections/:collectionId` | Tương đương, dùng `:collectionId` |
| Profile | `/:username` | `/*` (catch-all) → `ProfileRouteHandler` → `ProfilePage` | Đúng |
| Hồ sơ khi chưa có username | — | `/profile/user/:userId` | Fallback cho user cũ chưa đặt username |
| Sitemap.xml / robots.txt | SEO | Chưa thấy file `public/robots.txt` hay `public/sitemap.xml` | Cần bổ sung |
| 404 / Not Found | Có | Catch-all trỏ về `ProfileRouteHandler` — **chưa có 404 đẹp** | Cần tạo trang 404 riêng |

### 3.1 Trang khách (chưa đăng nhập)

| # | Trang | Đường dẫn | Trạng thái |
|---|---|---|---|
| 1 | Trang chủ | `/` (và `/t/:categorySlug` cho category) | [x] `HomePage.tsx` (App.tsx:226) |
| 2 | Khám phá (Explore) | `/explore` | [ ] **Chưa có route** — community dùng `/t/:categorySlug` thay thế. Brief yêu cầu trang riêng với hero nhỏ + bộ lọc dọc |
| 3 | Trang ảnh | `/photos/:slug` (route) | [x] `ImagePage.tsx` (App.tsx:228). Brief ghi `/photo/:id` nhưng site dùng slug |
| 4 | Bộ sưu tập (list) | `/collections` | [x] `CollectionsPage.tsx` (App.tsx:230) — **đã mở public** |
| 4b | Bộ sưu tập (detail) | `/collections/:collectionId` | [x] `CollectionDetailPage.tsx` (App.tsx:231) — **đã mở public** |
| 5 | Gói chụp (Packages) | `/packages` | [x] `PackagesPage.tsx` (App.tsx:228) — **mới tạo** |
| 6 | Chi tiết gói | `/packages/:slug` | [x] `PackagesPage.tsx` (App.tsx:229) — same component, render detail khi có `:slug` |
| 7 | Đặt lịch (Booking) | `/booking` | [x] `BookingPage.tsx` (App.tsx:234) — ProtectedRoute |
| 7b | Chi tiết booking | `/booking/:bookingId` | [x] `BookingDetailPage.tsx` (App.tsx:235) — ProtectedRoute |
| 8 | Blog/Concept | `/blog` & `/blog/:slug` | [ ] **Chưa có route** — không có component |
| 9 | About | `/about` | [~] `AboutPage.tsx` (App.tsx:226) — chỉ có contact info, **chưa có** story, số liệu, đội ngũ, giá trị cốt lõi |
| 10 | Liên hệ | `/contact` | [x] `ContactPage.tsx` (App.tsx:227) — **mới tạo** (info cards + form mailto + social) |
| 11 | Đăng nhập | `/signin` | [x] `SignInPage.tsx` (App.tsx:278). Brief ghi `/auth/signin` |
| 11b | Đăng ký | `/signup` | [x] `SignUpPage.tsx` (App.tsx:277). Brief ghi `/auth/signup` |
| 11c | OAuth Google callback | `/auth/google/callback` | [x] `GoogleCallbackPage.tsx` (App.tsx:279) |
| 11d | Test visual slider | `/test/visual-art-slider` | [x] `VisualArtFormsSlider` (App.tsx:235) — internal test, **nên ẩn ở production** |

### 3.2 Trang thành viên (yêu cầu đăng nhập)

| # | Trang | Đường dẫn | Trạng thái |
|---|---|---|---|
| 12 | Hồ sơ cá nhân | `/:username` (catch-all) | [x] `ProfilePage.tsx` qua `ProfileRouteHandler` (App.tsx:263) |
| 12b | Redirect khi vào `/profile` không slug | `/profile` | [x] `ProfileRedirect.tsx` (App.tsx:241) |
| 12c | Hồ sơ user cũ (chưa có username) | `/profile/user/:userId` | [x] `ProfilePage.tsx` (App.tsx:236) |
| 13 | Chỉnh sửa hồ sơ | `/profile/edit` (alias `/settings/profile`) | [x] `EditProfilePage.tsx` (App.tsx:248) — đã có alias `/settings/profile` |
| 14 | Upload | `/upload` | [x] `UploadPage.tsx` (App.tsx:251) — **đã thêm route** (file có sẵn từ trước) |
| 15 | Yêu thích ảnh (gom) | `/favorites` (alias `/favorites/photos`) | [x] `FavoritesPage.tsx` (App.tsx:252) — đã có alias |
| 16 | Yêu thích collection | `/favorites/collections` (alias `/favorite-collections`) | [x] `FavoriteCollectionsPage.tsx` (App.tsx:253) — đã có alias cho path cũ |
| 17 | Lịch sử tải xuống | `/downloads` | [x] `DownloadHistoryPage.tsx` (App.tsx:255) — bổ sung ngoài brief |
| 18 | Lịch đặt của tôi | `/profile/bookings` | [~] **Alias tạm** trỏ về `BookingPage` (App.tsx:259) — cần tách `MyBookings` ra page riêng |
| 19 | Gói đã lưu (Wishlist) | `/profile/saved-packages` | [ ] **Chưa có route** + chưa có data model wishlist gói |
| 20 | Thông báo | `/notifications` | [x] `NotificationPage.tsx` (App.tsx:256) — **mới tạo** đầy đủ list + filter + mark read + delete |
| 21 | Notifications settings | `/settings/notifications` | [x] **Đã thêm route** (App.tsx:249) → `NotificationPage` (tạm, cần trang settings riêng) |

### 3.3 Trang admin (yêu cầu quyền admin)

| # | Trang | Đường dẫn | Trạng thái |
|---|---|---|---|
| 22 | Admin Dashboard | `/admin` | [x] `AdminPage.tsx` (App.tsx:269) — single SPA, tabs bên trong |
| - | Tab Tổng quan | `/admin` (default) | [x] `AdminDashboard.tsx` |
| - | Tab Bookings + Calendar | `/admin/bookings`, `/admin/calendar` | [x] `AdminBookings.tsx` (view=table/calendar) |
| - | Tab Ảnh | `/admin/images` | [x] `AdminImages.tsx` |
| - | Tab Danh mục | `/admin/categories` | [x] `AdminCategories.tsx` |
| - | Tab Gói chụp | `/admin/packages` | [x] View "Gói chụp" trong `AdminBookings.tsx` |
| - | Tab Users | `/admin/users` | [x] `AdminUsers.tsx` |
| - | Tab Favorites | `/admin/favorites` | [x] `AdminFavorites.tsx` |
| - | Tab Roles | `/admin/roles` | [x] `AdminRoles.tsx` |
| - | Tab Moderation | `/admin/moderation` | [x] `AdminModeration.tsx` |
| - | Tab Collections | `/admin/collections` | [x] `AdminCollections.tsx` |
| - | Tab Analytics | `/admin/analytics` | [x] `AdminAnalytics.tsx` + `AdminTrafficAnalytics.tsx` + `UserAnalyticsDashboard.tsx` |
| - | Tab WebSocket metrics | `/admin/websocket` | [x] `AdminWebSocketMetrics.tsx` |
| - | Tab Logs | `/admin/logs` | [x] `AdminLogs.tsx` |
| - | Tab Settings | `/admin/settings` | [x] `AdminSettings.tsx` |

> **Ghi chú Admin**: Toàn bộ admin là SPA 1 route `/admin` với tab nội bộ. Brief yêu cầu các URL riêng (`/admin/bookings`, `/admin/calendar`, ...) — có thể giữ nguyên SPA hoặc tách thành nested routes (`/admin/bookings`, `/admin/calendar`...) để SEO/internal link tốt hơn. Hiện tại **OK**, không ưu tiên tách.

### 3.4 Trang Public nên mở khoá (bỏ ProtectedRoute)

Theo brief "PhotoCloud vừa là nền tảng ảnh công khai, vừa là studio booking" — các trang sau nên **public** (ai cũng xem được, chỉ cần đăng nhập khi tương tác):

- [ ] `/collections` — mở public, CTA "Lưu" yêu cầu đăng nhập
- [ ] `/collections/:collectionId` — mở public
- [ ] `/photos/:slug` — đã public ✓
- [ ] `/t/:categorySlug` — đã public ✓ (`HomePage`)

### 3.5 Bổ sung cần làm (action items Section 3) — cập nhật 12/10/2026

| # | Task | File | Ưu tiên | Trạng thái |
|---|---|---|---|---|
| S3-1 | Mở public `/collections` + `/collections/:id` (chuyển khỏi `ProtectedRoute`) | `App.tsx:226-235` | Cao | [x] **Đã làm** — chuyển ra ngoài `ProtectedRoute` |
| S3-2 | Đổi `/favorite-collections` → `/favorites/collections` | `App.tsx:244` | Trung bình | [x] **Đã làm** — thêm route mới `/favorites/collections` + giữ alias cũ |
| S3-3 | Thêm route `/upload` | `App.tsx` | Cao | [x] **Đã làm** — đăng ký `UploadPage` (file có sẵn) |
| S3-4 | Thêm route `/notifications` + tạo `NotificationPage.tsx` | `App.tsx` | Trung bình | [x] **Đã làm** — tạo `NotificationPage.tsx` + `.css` đầy đủ (list, mark read, mark all, delete, filter tab) |
| S3-5 | Thêm route `/profile/bookings` | `App.tsx` | Trung bình | [~] alias tạm trỏ về `BookingPage` — cần tách `MyBookings` ra page riêng sau |
| S3-6 | Tạo trang `/packages` (list) + `/packages/:slug` (detail) | mới | Cao | [x] **Đã làm** — `PackagesPage.tsx` + `.css` (hero, 4 cards + custom quote, detail view) |
| S3-7 | Tạo trang `/blog` (list) + `/blog/:slug` (detail) | mới | Thấp | [ ] chưa làm |
| S3-8 | Tạo trang `/contact` (riêng) | mới | Trung bình | [x] **Đã làm** — `ContactPage.tsx` + `.css` (4 info card + form mailto + social) |
| S3-9 | Tạo trang `/explore` (hero + bộ lọc) | mới | Trung bình | [ ] chưa làm |
| S3-10 | Thêm alias `/settings/profile` + `/settings/notifications` | `App.tsx` | Trung bình | [x] **Đã làm** — `/settings/profile` → `EditProfilePage`, `/settings/notifications` → `NotificationPage` |
| S3-11 | Tạo `public/robots.txt` + `public/sitemap.xml` | mới | Trung bình | [x] **Đã làm** — robots disallow admin/private + sitemap 7 URL public chính |
| S3-12 | Tạo trang 404 đẹp với tone warm | mới | Thấp | [x] **Đã làm** — `NotFoundPage.tsx` + `.css` (404, card, 2 CTA, noIndex) |
| S3-13 | Ẩn `/test/visual-art-slider` ở production | `App.tsx:235` | Thấp | [ ] chưa làm (route vẫn mở) |

#### Cập nhật Section 3 — kết quả

- **9/13 action items đã hoàn thành** trong ngày 12/10/2026.
- **4 items chưa làm**: S3-5 (tách MyBookings), S3-7 (blog), S3-9 (explore), S3-13 (ẩn test route) — đều ở mức Trung bình trở xuống.
- Build pass clean (8.86s), không có lỗi TypeScript mới.

---

## 4. Bố cục chung (Layout System)

### 4.1 Desktop (≥1024px)

- [x] Header sticky (Unsplash-style, 2 hàng: logo + search + actions / category nav).
- [x] Search bar ở giữa header.
- [x] Sidebar trái 64px (`ImagePageSidebar`).
- [x] CTA "Đặt lịch chụp" pill đen trên header.
- [~] **Chưa thấy menu ngang** "Khám phá · Gói · Đặt lịch" — hiện dùng CategoryNavigation hàng ngang dưới header.

### 4.2 Tablet (640–1024px)

- [~] Mobile header dùng `useIsMobile` để thu gọn search thành icon — có nhưng cần xác nhận search-expand-on-click.
- [ ] Bottom bar tablet — chưa có (sidebar vẫn hiện).

### 4.3 Mobile (<640px)

- [x] Bottom nav — chưa có bottom bar cố định 5 icon.
- [x] Mobile header: menu (☰) + logo + search icon + booking icon (`CalendarDays`).
- [x] Booking modal mobile có responsive CSS trong `BookingModal.css`.
- [~] Modal mobile cần bottom sheet ~92vh — chưa rõ CSS đã đạt chưa.

---

## 5. Chi tiết từng trang chính

### 5.1 Trang chủ (`/`)

- [x] Header (logo + search + menu + CTA Đặt lịch).
- [x] Hero booking — `HeroBooking.tsx` (eyebrow + H1 + mô tả + 2 CTA + 3 trust pill + 2 photo card).
- [x] Section 4 gói nổi bật — `PackagesSection.tsx` (Chân dung, Couple, Gia đình, Mini session) + custom-quote card.
- [ ] Portfolio theo dịch vụ — **chưa có** (cần 3–4 hàng masonry, mỗi dịch vụ 6–8 ảnh).
- [x] Quy trình 4 bước — `HowItWorks.tsx` (Chọn gói → Chọn ngày → Xác nhận → Nhận gallery).
- [~] Testimonial — `HomePage.tsx:251` có 1 block social-proof đơn giản, **chưa phải carousel** đầy đủ với avatar + tên + gói + rating.
- [ ] Bảng giá rút gọn — **chưa có**.
- [x] CTA đặt lịch lặp lại — `FinalCTA.tsx`.
- [x] Lưới ảnh cộng đồng — `RetainedCategoryGrid` (giữ nguyên Unsplash masonry).
- [~] Footer 4 cột — **chưa có footer riêng** trong `HomePage`.

### 5.2 Trang Explore (`/explore`)

- [ ] **Chưa có trang riêng** — community dùng `/t/:categorySlug` thay thế (không có hero nhỏ "Khám phá ảnh từ cộng đồng").
- [~] Bộ lọc dọc (danh mục, màu, địa điểm, photographer) — `SearchFilters.tsx` có nhưng chưa dùng cho trang explore độc lập.
- [x] Lưới masonry infinite-scroll, skeleton — `RetainedCategoryGrid` đã có.

### 5.3 Trang ảnh (`/photo/:id`)

- [x] Modal overlay — `ImagePage.tsx`.
- [x] Sidebar phải — `ImagePageSidebar.tsx` (like, save, download, share, photographer).
- [x] Tiêu đề + mô tả + tags — có trong `ImagePage.tsx`.
- [x] Ảnh liên quan — có trong `ImagePage` (cần xác nhận masonry ngang).

### 5.4 Trang Packages (`/packages`)

- [ ] **Chưa có trang** — chỉ có `PackagesSection` ở homepage.
- [ ] Bảng so sánh 4 gói — **chưa có**.
- [ ] FAQ accordion — **chưa có**.

### 5.5 Trang chi tiết gói (`/packages/:slug`)

- [ ] **Chưa có** — `slug` đã có trong `CORE_PACKAGES` nhưng chưa có route.

### 5.6 Trang Booking (`/booking`) & Modal

- [x] Trang `BookingPage.tsx` — header serif + 4 section form (chọn gói, thời gian, liên hệ, ý tưởng) + summary + policy note.
- [x] Modal `BookingModal.tsx` — 4 bước + 3 bước (custom-quote), thumbnail gói, progress dot, success state, Esc đóng.
- [x] Trust signal: "Chưa cần thanh toán · phản hồi 24h · đổi lịch 1 lần".
- [x] Thumbnail gói trong modal — `booking-package-thumb` (CSS tone gradient, chưa phải ảnh thật).
- [~] Success state có check + "Xem chi tiết" + "Thêm vào lịch" — có nhưng nút "Thêm vào lịch" hiện chỉ toast demo.
- [ ] FAQ accordion cọc/đổi lịch/nhận ảnh/chỉnh thêm/ngoại tỉnh — **chưa có** trên `BookingPage`.

### 5.7 Trang Blog/Concept (`/blog`)

- [ ] **Chưa có** — không có route, không có component.

### 5.8 Trang About (`/about`)

- [~] `AboutPage.tsx` hiện chỉ có liên hệ + bio + social.
- [ ] Story ngắn — **chưa có**.
- [ ] Số liệu: 500+ buổi, 4.9/5, 5 năm — **chưa có**.
- [ ] Đội ngũ 3–4 photographer — **chưa có**.
- [ ] Giá trị cốt lõi 3 cột — **chưa có**.
- [ ] CTA liên hệ — có (ContactButton floating).

### 5.9 Trang Profile (`/:username`)

- [x] Cover + avatar + bio — `ProfileHeader.tsx`.
- [x] Tabs: Photos, Following, Followers, Collections, Stats, Bookings — `ProfileTabs.tsx`.
- [x] Lưới masonry ảnh/collections.
- [x] Follow / Đặt lịch photographer.

### 5.10 Trang Lịch đặt của tôi (`/profile/bookings`)

- [x] `MyBookings.tsx` — list card, status badge.
- [ ] **Filter chips** Tất cả / Sắp tới / Đang xử lý / Hoàn thành / Đã hủy — **chưa có**.
- [ ] Phân nhóm section — **chưa có**.
- [ ] Countdown "Còn 3 ngày" — **chưa có**.
- [ ] Nút "Yêu cầu đổi lịch" — **chưa có** trong card user.
- [ ] Trạng thái "Chờ xác nhận · phản hồi 24h" — **chưa có**.
- [ ] Nút "Đánh giá" / "Xem gallery" cho completed — **chưa có**.

### 5.11 Admin Dashboard (`/admin`)

- [x] Top cards (tổng users/images/categories) — `AdminDashboard.tsx`.
- [ ] **Top cards booking** (yêu cầu hôm nay, confirmed tuần này, chờ xử lý, sắp diễn ra, tỷ lệ xác nhận) — **chưa có** booking widget riêng.
- [x] System status widget (CPU, RAM, Disk, Response time).
- [x] Recent users + recent images bảng.
- [ ] Biểu đồ booking 7 ngày + doanh thu — **chưa có**.
- [ ] Calendar nhỏ tháng — **chưa có** ở dashboard (chỉ ở `AdminBookings`).

### 5.12 Admin Bookings (`/admin/bookings`)

- [x] Bảng desktop — `AdminBookings.tsx` (mã, khách, gói, ngày, địa điểm, trạng thái, thao tác).
- [x] Quick action: select đổi trạng thái (reviewing/needs_information/confirmed/rescheduled/completed/rejected/cancelled).
- [~] Màu trạng thái olive/amber — token có nhưng CSS `.booking-status-*` chưa dùng token, dùng màu cũ (`AdminPage.css:344-347`).
- [ ] Bảng mobile → card list — **chưa rõ** đã làm.

### 5.13 Admin Calendar (`/admin/calendar`)

- [x] Toggle Tháng/Tuần/Ngày — `AdminBookings.tsx` (view=calendar, calendarMode).
- [~] Tooltip khi hover ô ngày — có `.admin-calendar-item` nhưng **chưa thấy tooltip** dạng "14:00 - Chân dung - Nguyễn An - Confirmed".
- [ ] Mobile mặc định Tuần — **chưa rõ** có auto-detect không.

---

## 6. Component Library & hệ thống thiết kế

### 6.1 Buttons
- [x] Primary (CTA) — `.studio-cta-primary` pill đen, radius 999px, padding 13/20.
- [x] Secondary — `.studio-cta-secondary` outline.
- [x] Ghost — `.studio-cta-ghost` chỉ chữ.
- [x] Danger — chưa có class riêng (đề xuất `.studio-cta-danger` dùng `--studio-status-danger`).
- [x] Hover translateY(-1px) + shadow — đã có trong CSS.
- [x] Active scale(0.98) — đã có.
- [x] Loading spinner — `BookingModal.tsx:268` có `.booking-modal-spinner`.

### 6.2 Cards
- [x] Shadow nhẹ — `--studio-shadow-card` 0 1px 2px / 0 8px 24px.
- [x] Radius 16px — `--studio-radius-card`.
- [x] Hover translateY(-2px) + shadow tăng — `.studio-card.is-hoverable:hover`.

### 6.3 Form inputs
- [~] Border `#E8E2D6` — token có, cần áp dụng đồng nhất (nhiều input hiện dùng Tailwind mặc định).
- [x] Focus ring đồng `#B8865B` — CSS có nhưng chỉ cho studio CTA.
- [~] Radius 12px — chưa thống nhất (một số dùng 8px do global rule).

### 6.4 Modal
- [x] Booking modal — `BookingModal.tsx`.
- [x] Backdrop + translateY/scale — CSS có.
- [~] Container radius 32px — cần verify trong `BookingModal.css`.

### 6.5 Toast
- [x] `sonner` đã tích hợp.

### 6.6 Skeleton
- [x] `Skeleton` component (`@/components/ui/skeleton`) — dùng trong `AdminDashboard`.
- [x] `.skeleton-image` shimmer — `theme.css`.

### 6.7 Hệ thống icon
- [x] `lucide-react` với stroke 1.5 — đã dùng toàn site.

---

## 7. Chuyển động & tương tác

- [x] Reveal on scroll — `useRevealOnScroll` hook + `.studio-reveal` CSS (Hero, Packages, HowItWorks, FinalCTA đều dùng).
- [x] Hover ảnh lưới — `.studio-package-image img:hover scale(1.04)` (cần verify có tên tác giả + like khi hover cho grid chính).
- [x] Modal — backdrop fade 200ms + translateY/scale (CSS đã có).
- [~] Button micro-interaction — translateY(-1px) + shadow có, active scale(0.98) có.
- [ ] Page transition fade 150ms — **chưa có**.
- [x] Không parallax / hero slider / confetti / cursor custom / Lenis — tuân thủ.

---

## 8. Phân biệt cảm xúc theo nhóm trang

| Nhóm | Tone | Trạng thái |
|---|---|---|
| Trang chủ / Explore / Ảnh | Hiện đại tối giản | [~] Hero booking warm đã áp, gallery giữ trắng Unsplash — chưa đồng nhất warm |
| Booking / Packages / About / Blog | Ấm, cao cấp, riêng tư | [~] `BookingPage` dùng serif + warm, AboutPage vẫn làm contact info thuần |
| Profile | Hơi ấm, cá nhân | [x] Có |
| Admin | Dashboard chuyên nghiệp | [x] Dùng sans, density cao |

---

## 9. Khảo năng truy cập & SEO

- [x] Alt cho ảnh — `BlurUpImage` có alt text.
- [x] Focus ring cho studio CTA — `.studio-cta-primary:focus-visible` outline copper.
- [~] Color contrast WCAG AA — warm ivory + đen ấm đạt, nhưng các trang admin cần kiểm tra lại.
- [~] Keyboard nav modal/booking — Esc đóng có, Tab focus cần verify.
- [~] Meta title/description từng trang — `useSiteSettings` có `siteDescription`, còn title cho từng route cần kiểm tra.
- [ ] Open Graph ảnh hero — **chưa có**.
- [ ] Structured data Photographer / Service / FAQPage / Article — **chưa có** (chưa có JSON-LD).

---

## 10. Lộ trình triển khai đề xuất

### Giai đoạn 1 — Nền tảng thương hiệu (gần xong)
- [x] Design tokens warm trong `index.css`.
- [x] Tailwind config + CSS variables.
- [~] Áp dụng warm ivory cho toàn trang branded — HeroBooking/Packages đã có, About/Profile/BookingPage cần review.

### Giai đoạn 2 — Hero + Packages (gần xong)
- [x] Hero booking + 4 gói + CTA lặp lại.
- [ ] Portfolio theo dịch vụ.
- [ ] Testimonial carousel đầy đủ (avatar + tên + gói + rating).

### Giai đoạn 3 — Booking flow (đang làm)
- [x] `/booking`, modal 4 bước, success state, My Bookings cơ bản.
- [ ] FAQ accordion.
- [ ] Filter chip + countdown + nút đổi lịch trong My Bookings.
- [ ] Áp token màu olive/amber/danger cho `.booking-status-*`.

### Giai đoạn 4 — Studio layer
- [~] AboutPage cần bổ sung story + số liệu + đội ngũ + giá trị cốt lõi.
- [ ] Trang `/packages` (bảng so sánh) + `/packages/:slug` (hero + portfolio + sticky summary).
- [ ] Trang `/blog` & `/blog/:slug`.
- [ ] Trang `/contact`.
- [ ] Trang `/explore` riêng.
- [ ] Trang `/notifications` riêng.

### Giai đoạn 5 — Admin polish
- [x] Calendar month/week/day, availability, policy, reviews.
- [ ] Tooltip calendar "14:00 - Chân dung - Nguyễn An - Confirmed".
- [ ] Booking Dashboard widget trên `AdminDashboard`.
- [ ] Áp token màu trạng thái booking.

### Giai đoạn 6 — Growth
- [ ] Availability preview public ("Tuần này còn 4 slot").
- [ ] Wishlist gói + trang `/profile/saved-packages`.
- [ ] Referral, ưu đãi booking lần 2, mini session nhóm.
- [ ] Blog nội dung.
- [ ] Open Graph + JSON-LD.

---

## Backlog / Definition of Done (rút gọn từ brief cũ)

- [ ] Người dùng mới hiểu ngay PhotoCloud có nhận chụp ảnh → Hero ✓.
- [ ] Người dùng thấy giá tham khảo trước khi đặt lịch → PackagesSection ✓.
- [ ] Người dùng biết đặt lịch ở đâu ngay từ homepage → CTA header + hero ✓.
- [ ] Người dùng hiểu quy trình booking → HowItWorks ✓.
- [ ] Mobile đặt lịch dễ dàng → BookingModal responsive ✓ (cần verify bottom sheet 92vh).
- [ ] Màu trạng thái booking nhất quán toàn hệ thống → **chưa** (cần áp token olive/amber/danger).
- [ ] Motion tinh tế → Reveal + hover + micro-interaction ✓.
- [ ] Lưới ảnh load nhanh, không layout shift → `BlurUpImage` + skeleton ✓.

---

## Tóm tắt nhanh

| Nhóm | Đã có | Đang dở | Còn thiếu |
|------|-------|---------|-----------|
| Design tokens & warm theme | 100% | — | — |
| Header / CTA / mobile actions | 90% | Search-expand tablet | Bottom nav mobile |
| Hero / Packages / HowItWorks / FinalCTA | 95% | Testimonial carousel | Portfolio theo dịch vụ, bảng giá rút gọn |
| Booking page + modal | 90% | Thumbnail ảnh thật cho gói trong modal | FAQ accordion |
| My Bookings (user) | 50% | — | Filter chip, phân nhóm, countdown, nút đổi lịch/đánh giá |
| Admin Bookings + Calendar | 85% | Tooltip, mobile default view | Booking dashboard widget riêng |
| Admin Dashboard | 70% | — | Top cards booking + biểu đồ doanh thu + calendar mini |
| About / Blog / Contact / Explore | 10% | About cơ bản | Story, số liệu, đội ngũ, blog, contact page, explore riêng |
| Trang Packages & chi tiết | 0% | — | Toàn bộ |
| Wishlist / Saved packages | 0% | — | Toàn bộ |
| Availability preview public | 0% | — | Toàn bộ |
| Màu trạng thái booking đồng nhất | 30% | Token có | CSS chưa dùng token |
| SEO/OG/Structured data | 20% | Meta desc từ settings | OG image, JSON-LD |
| Reveal on scroll + micro-interaction | 95% | Page transition | — |

> Cập nhật: 11/10/2026.
