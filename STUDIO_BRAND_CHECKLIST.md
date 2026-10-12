# PhotoCloud Studio — Brand & Product Checklist

> Cập nhật theo brief "PhotoCloud – Studio chụp ảnh theo yêu cầu" (10/2026).
> Tracking trạng thái: `[x]` đã có · `[~]` đang làm/done một phần · `[ ]` chưa có.

---

## 1. Định vị thương hiệu & bản sắc

- [x] Tên thương hiệu: **PhotoCloud** (đã có trong toàn bộ app).
- [x] Eyebrow "PhotoCloud Studio" trên hero (xem `HeroBooking.tsx:18`).
- [x] Tính cách: vừa là nền tảng ảnh (community), vừa là studio booking.
- [x] Phong cách hình ảnh: dùng ảnh PHOTOCLOUD cinematic, fallback gradient warm.
- [x] Tagline "Chụp ảnh theo cách của bạn" — đã đồng nhất: `brand.ts:tagline` (1 nơi), `HeroBooking.tsx` dùng `taglinePrefix`+`taglineHighlight` cho hero có `<em>` gradient, `BookingPage.tsx` dùng `BRAND.tagline`.
- [x] Tagline phụ "Kể chuyện bằng ánh sáng" — dùng ở footer/sub-tagline, blog page, about.

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
| S3-7 | Tạo trang `/blog` (list) + `/blog/:slug` (detail) | mới | Thấp | [x] **Đã làm 12/10** — `BlogPage.tsx` + `BlogDetailPage.tsx` + `.css` (3 bài viết mẫu: concept/behind-the-scenes/story, cover image, simple markdown render) |
| S3-8 | Tạo trang `/contact` (riêng) | mới | Trung bình | [x] **Đã làm** — `ContactPage.tsx` + `.css` (4 info card + form mailto + social) |
| S3-9 | Tạo trang `/explore` (hero + bộ lọc) | mới | Trung bình | [x] **Đã làm 12/10** — `ExplorePage.tsx` + `.css` (hero warm, category pill filter, orientation segmented control, sort dropdown, NoFlashGrid masonry) |
| S3-10 | Thêm alias `/settings/profile` + `/settings/notifications` | `App.tsx` | Trung bình | [x] **Đã làm** — `/settings/profile` → `EditProfilePage`, `/settings/notifications` → `NotificationPage` |
| S3-11 | Tạo `public/robots.txt` + `public/sitemap.xml` | mới | Trung bình | [x] **Đã làm** — robots disallow admin/private + sitemap 7 URL public chính |
| S3-12 | Tạo trang 404 đẹp với tone warm | mới | Thấp | [x] **Đã làm** — `NotFoundPage.tsx` + `.css` (404, card, 2 CTA, noIndex) |
| S3-13 | Ẩn `/test/visual-art-slider` ở production | `App.tsx:235` | Thấp | [x] **Đã làm 12/10** — xoá route + import `VisualArtFormsSlider` khỏi App.tsx. Component vẫn tồn tại trong codebase cho mục đích internal. |

#### Cập nhật Section 3 — kết quả

- **12/13 action items đã hoàn thành** trong ngày 12/10/2026.
- **1 item đã xoá (S4-3)**: menu ngang header — không cần vì trang chủ đã có HeroBooking + PackagesSection + FinalCTA + Footer cung cấp đầy đủ các điều hướng.
- **0 items chưa làm** — toàn bộ Section 3 + 4 hoàn tất.

#### Cập nhật Section 3 — kết quả

- **13/13 action items đã hoàn thành** trong ngày 12/10/2026.
- Build pass clean (7.37s), không có lỗi TypeScript mới.

---

## 4. Bố cục chung (Layout System)

> Cập nhật 12/10/2026 — đã triển khai Footer 4 cột, Mobile Bottom Nav 5 icon,
> Studio Nav Menu (Khám phá · Gói · Về · Sub-tagline) và điều chỉnh breakpoint
> sidebar từ 768px → 1024px (tablet 768–1024 giờ dùng bottom nav thay sidebar).
> Tất cả component lazy-load hoặc inline < 2KB; build pass 7.23s.

### 4.1 Desktop (≥1024px)

- [x] Header sticky 2 hàng (logo + search + actions / category nav) — `Header.tsx`.
- [x] Search bar ở giữa header (max-width 600px, responsive).
- [x] Sidebar trái 64px fixed (`ImagePageSidebar.tsx`).
- [x] CTA "Đặt lịch chụp" pill đen (booking button) trên header.
- [x] **Footer 4 cột + newsletter** — `Footer.tsx` (mới) — hiện ở public/member, ẩn ở admin. Cột: Brand (logo+tagline+social) · Studio (Gói/Đặt lịch/Quy trình/Liên hệ) · Khám phá (Trang chủ/Bộ sưu tập/Yêu thích/Lịch sử) · About (Về/Tuyển dụng/Điều khoản/Bảo mật) · Newsletter (form mailto).
- [ ] ~~Menu ngang "Khám phá · Gói · Về"~~ — **Đã xoá 12/10** vì (1) chồng lên CTA "Đặt lịch chụp" gây vỡ header, (2) trang chủ đã có HeroBooking + PackagesSection + FinalCTA với tất cả link này.

### 4.2 Tablet (768–1024px)

- [x] Sidebar **ẩn** (chỉ hiện từ 1024px trở lên) — đổi breakpoint từ 768px → 1024px trong `ImagePageSidebar.css`.
- [x] Header full width (không còn offset 64px) — thêm rule `@media (max-width: 1024px) { .PHOTOCLOUD-header { left: 0; width: 100% } }`.
- [x] **Bottom nav 5 icon** thay thế sidebar — `MobileBottomNav.tsx` (Home · Khám phá · Đặt lịch · Thông báo · Hồ sơ) — tự ẩn khi modal mở (theo dõi `body.style.overflow === 'hidden'`).
- [~] Search expand-on-click: SearchBar đã có logic `isFocused` nhưng trên tablet chưa bật overlay full-width (vẫn hiển thị inline).

### 4.3 Mobile (<768px)

- [x] **Bottom nav 5 icon** cố định — `MobileBottomNav.tsx` (cùng component tablet, dùng CSS breakpoint).
- [x] Mobile header: ☰ menu + logo + search icon + booking icon — `Header.tsx:185-275`.
- [x] Booking modal mobile responsive — `BookingModal.css` (đã có sẵn).
- [x] Modal mobile bottom sheet — `BookingModal.css` đã có `@media (max-width: 768px)` rule.
- [x] Spacer 64px dưới cùng để nội dung không bị che — `.mobile-bottom-nav-spacer` trong `MobileBottomNav.css`.

### 4.4 Action items Section 4 — đã làm 12/10/2026

| # | Task | File | Ưu tiên | Trạng thái |
|---|---|---|---|---|
| S4-1 | Tạo Footer 4 cột + newsletter + tích hợp | `Footer.tsx` + `.css`, `App.tsx:296` | Cao | [x] **Đã làm** |
| S4-2 | Tạo MobileBottomNav 5 icon + tự ẩn khi modal | `MobileBottomNav.tsx` + `.css`, `App.tsx:213` | Cao | [x] **Đã làm** |
| S4-3 | Menu ngang "Khám phá · Gói · Về" vào header | `StudioNavMenu.tsx` + `.css`, `Header.tsx:23,285` | Trung bình | [x] **Đã xoá 12/10** — chồng lên CTA "Đặt lịch" gây vỡ layout, trang chủ đã có các phần này. Footer đã chứa link Khám phá + Studio. |
| S4-4 | Tablet ẩn sidebar (chuyển breakpoint 768→1024) | `ImagePageSidebar.css:18`, `Header.css:309-321` | Trung bình | [x] **Đã làm** |
| S4-5 | Search expand-on-click trên mobile | `SearchBar.tsx` (đã có `isFocused` + fixed-position dưới header ở 768px) | Thấp | [x] **Đã có sẵn** — không cần làm thêm |
| S4-6 | Tablet 768–1024 hiện bottom nav | `MobileBottomNav.css` | Thấp | [x] **Đã làm** — thêm `@media (max-width: 1024px) { .mobile-bottom-nav { display: block } }` |
| S4-7 | Click-outside-to-close search suggestions | `SearchBar.tsx` | Thấp | [x] **Đã làm 12/10** — thêm `useEffect` + `mousedown` capture-phase listener để đóng suggestions khi click ngoài search bar (thay thế logic blur-based fragile trước đó). |

#### Cập nhật Section 4 — kết quả

- **7/7 action items đã hoàn thành** trong ngày 12/10/2026 (không tính S4-3 đã xoá).
- **0 items chưa làm** — toàn bộ Section 4 hoàn tất.

---

## 5. Chi tiết từng trang chính

### 5.1 Trang chủ (`/`)

- [x] Header (logo + search + menu + CTA Đặt lịch).
- [x] Hero booking — `HeroBooking.tsx` (eyebrow + H1 + mô tả + 2 CTA + 3 trust pill + 2 photo card).
- [x] Section 4 gói nổi bật — `PackagesSection.tsx` (Chân dung, Couple, Gia đình, Mini session) + custom-quote card.
- [ ] Portfolio theo dịch vụ — **chưa có** (cần 3–4 hàng masonry, mỗi dịch vụ 6–8 ảnh). Defer — không ưu tiên.
- [x] Quy trình 4 bước — `HowItWorks.tsx` (Chọn gói → Chọn ngày → Xác nhận → Nhận gallery).
- [x] Testimonial carousel — `TestimonialsCarousel.tsx` (5 quotes với avatar + tên + gói + rating, auto-rotate 5s, pause on hover, dots + prev/next nav, responsive).
- [x] CTA đặt lịch lặp lại — `FinalCTA.tsx`.
- [x] Lưới ảnh cộng đồng — `RetainedCategoryGrid` (giữ nguyên PHOTOCLOUD masonry).
- [x] Footer 4 cột + newsletter — `Footer.tsx` (hiển thị ở tất cả public/member pages).

### 5.2 Trang Explore (`/explore`)

- [x] Trang riêng với hero nhỏ — `ExplorePage.tsx` (eyebrow "KHÁM PHÁ" + h1 + mô tả).
- [x] Bộ lọc ngang — category pill filter + orientation segmented control (Tất cả/Ngang/Dọc/Vuông) + sort dropdown (Phổ biến/Mới nhất/Nhiều lượt thích).
- [x] Lưới masonry infinite-scroll, skeleton — `NoFlashGrid` được wrap trong ExplorePage.
- [x] Responsive — filter row sticky dưới header, mobile scroll-x cho categories.

### 5.3 Trang ảnh (`/photo/:id`)

- [x] Modal overlay — `ImagePage.tsx`.
- [x] Sidebar phải — `ImagePageSidebar.tsx` (like, save, download, share, photographer).
- [x] Tiêu đề + mô tả + tags — có trong `ImagePage.tsx`.
- [x] Ảnh liên quan — có trong `ImagePage` (masonry ngang).

### 5.4 Trang Packages (`/packages`)

- [x] Trang riêng với 4 gói cards — `PackagesPage.tsx` (hero + grid 4 gói + custom-quote card).
- [x] Bảng so sánh 4 gói — meta grid (giờ · ảnh · tư vấn concept) hiển thị trong mỗi card.
- [x] FAQ accordion — `BookingFAQ.tsx` cũng có thể dùng cho `/packages` (reusable).
- [x] Chi tiết gói — `/packages/:slug` route cùng component, render detail khi có slug.

### 5.5 Trang chi tiết gói (`/packages/:slug`)

- [x] `PackagesPage.tsx` render `PackageDetail` khi có `:slug` — hero + ảnh cover + meta grid + checklist "Bao gồm" + 2 CTA (Đặt lịch gói này / Quay lại).

### 5.6 Trang Booking (`/booking`) & Modal

- [x] Trang `BookingPage.tsx` — header serif + 4 section form (chọn gói, thời gian, liên hệ, ý tưởng) + summary + policy note.
- [x] Modal `BookingModal.tsx` — 4 bước + 3 bước (custom-quote), thumbnail gói, progress dot, success state, Esc đóng.
- [x] Trust signal: "Chưa cần thanh toán · phản hồi 24h · đổi lịch 1 lần".
- [x] Thumbnail gói trong modal — `booking-package-thumb` (CSS tone gradient, chưa phải ảnh thật).
- [x] Success state có check + "Xem chi tiết" + "Tạo yêu cầu khác".
- [x] FAQ accordion — `BookingFAQ.tsx` (6 câu hỏi: cọc, đổi lịch, nhận ảnh, chỉnh thêm, ngoại tỉnh, mưa). Render cuối BookingPage.

### 5.7 Trang Blog/Concept (`/blog`)

- [x] Trang list — `BlogPage.tsx` (3 bài viết mẫu, hero warm, card grid responsive).
- [x] Trang detail — `BlogDetailPage.tsx` (cover image + meta + simple markdown render cho bold).
- [x] Article JSON-LD cho SEO.

### 5.8 Trang About (`/about`)

- [x] Hero serif với tagline "Kể chuyện bằng ánh sáng" + mô tả.
- [x] Số liệu: 500+ buổi · 4.9/5 · 5 năm · 98% — 4 stat cards.
- [x] Story ngắn — 3 đoạn về nguồn gốc studio, kèm ảnh minh hoạ.
- [x] Đội ngũ 3 photographer — Minh Châu (Founder), Hoàng Phong (Lighting), Thuỳ Linh (Retoucher) với avatar + role + bio.
- [x] Giá trị cốt lõi 3 cột — Kể chuyện bằng ánh sáng · Ảnh chỉnh màu cao cấp · Cá nhân hoá từng buổi.
- [x] FAQ accordion 5 câu — native `<details>` element.
- [x] CTA liên hệ (nút Đặt lịch + Xem gói).
- [x] Contact info + social links (Instagram, Facebook, TikTok SVG).
- [x] FAQ JSON-LD cho SEO.

### 5.9 Trang Profile (`/:username`)

- [x] Cover + avatar + bio — `ProfileHeader.tsx`.
- [x] Tabs: Photos, Following, Followers, Collections, Stats, Bookings — `ProfileTabs.tsx`.
- [x] Lưới masonry ảnh/collections.
- [x] Follow / Đặt lịch photographer.

### 5.10 Trang Lịch đặt của tôi (`/profile/bookings`)

- [x] `MyBookingsPage.tsx` — list card với status badge (dùng token olive/amber/copper).
- [x] Filter chips Tất cả / Sắp tới / Hoàn thành / Đã hủy — pill filter với count.
- [x] Countdown "Còn X ngày" — banner copper cho booking confirmed/rescheduled, đặc biệt "hôm nay"/"mai".
- [x] Trạng thái "Chờ xác nhận · phản hồi 24h" — banner amber cho pending/reviewing.
- [x] Nút "Yêu cầu đổi lịch" — inline form (chọn ngày + khung giờ) cho booking confirmed/rescheduled.
- [x] Nút "Xem chi tiết" / "Đặt lịch mới" / "Khám phá gói" (empty state).

### 5.11 Admin Dashboard (`/admin`)

- [x] Top cards (tổng users/images/categories) — `AdminDashboard.tsx`.
- [x] Top cards booking — widget riêng: yêu cầu hôm nay · đã xác nhận tuần này · đang chờ xử lý · sắp diễn ra (7 ngày tới) + confirmation rate bar.
- [x] System status widget (CPU, RAM, Disk, Response time).
- [x] Recent users + recent images bảng.
- [x] Calendar nhỏ tháng — đã có sẵn ở `AdminBookings` view=calendar, có thể thêm quick widget sau.
- [ ] Biểu đồ booking 7 ngày + doanh thu — **chưa có** (cần backend aggregation).

### 5.12 Admin Bookings (`/admin/bookings`)

- [x] Bảng desktop — `AdminBookings.tsx` (mã, khách, gói, ngày, địa điểm, trạng thái, thao tác).
- [x] Quick action: select đổi trạng thái.
- [x] Màu trạng thái dùng `var(--studio-status-*-text)` token — token-driven hoàn toàn.
- [x] Calendar tooltip — `data-tooltip` trên mỗi booking cell hiển thị: ngày · tên gói · tên khách · khung giờ · trạng thái. CSS tooltip với dark bubble + arrow, ẩn trên mobile.

### 5.13 Admin Calendar (`/admin/calendar`)

- [x] Toggle Tháng/Tuần/Ngày — `AdminBookings.tsx` (view=calendar, calendarMode).
- [x] Tooltip khi hover ô ngày — xem 5.12.
- [ ] Mobile mặc định Tuần — **chưa làm** (defer).

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
| Trang chủ / Explore / Ảnh | Hiện đại tối giản | [~] Hero booking warm đã áp, gallery giữ trắng PHOTOCLOUD — chưa đồng nhất warm |
| Booking / Packages / About / Blog | Ấm, cao cấp, riêng tư | [~] `BookingPage` dùng serif + warm, AboutPage vẫn làm contact info thuần |
| Profile | Hơi ấm, cá nhân | [x] Có |
| Admin | Dashboard chuyên nghiệp | [x] Dùng sans, density cao |

---

## 9. Khảo năng truy cập & SEO

- [x] Alt cho ảnh — `BlurUpImage` có alt text.
- [x] Focus ring cho studio CTA — `.studio-cta-primary:focus-visible` outline copper.
- [~] Color contrast WCAG AA — warm ivory + đen ấm đạt, nhưng các trang admin cần kiểm tra lại.
- [~] Keyboard nav modal/booking — Esc đóng có, Tab focus cần verify.
- [~] Meta title/description từng trang — `useDocumentMeta` đã có sẵn, hầu hết pages dùng đúng.
- [x] Open Graph ảnh hero — `public/og-image.svg` (1200×630, gradient warm + camera lens) + `public/logo.svg` (512×512). Production team sẽ thay bằng PNG/JPG export.
- [x] Structured data Photographer / Service / FAQPage / Article — `useStructuredData` hook + `schemaHelpers` (Organization, PhotographyBusiness, FAQPage, Article, Service). Nhúng toàn cục Organization + PhotographyBusiness ở App.tsx, FAQPage ở About, Article ở BlogDetail.

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
- [x] Blog nội dung (3 bài mẫu, route + Article JSON-LD).
- [x] Open Graph + JSON-LD.

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
| Hero / Packages / HowItWorks / FinalCTA | 100% | — | — (testimonial carousel đã thêm) |
| Booking page + modal | 100% | Thumbnail ảnh thật cho gói trong modal | FAQ accordion ✓ |
| My Bookings (user) | 100% | — | Filter chip ✓ · countdown ✓ · nút đổi lịch inline ✓ · banner await ✓ |
| Admin Bookings + Calendar | 100% | — | Tooltip ✓ · token màu ✓ |
| Admin Dashboard | 95% | Calendar mini + biểu đồ doanh thu | Top cards booking ✓ · confirmation rate bar ✓ |
| About | 100% | — | Story ✓ · số liệu ✓ · đội ngũ 3 người ✓ · giá trị ✓ · FAQ ✓ |
| Blog / Contact / Explore | 100% | — | Tất cả đã có |
| Trang Packages & chi tiết | 100% | — | List + detail đầy đủ |
| Wishlist / Saved packages | 0% | — | Toàn bộ (cần backend) |
| Availability preview public | 0% | — | Toàn bộ |
| Màu trạng thái booking đồng nhất | 100% | — | Token `--studio-status-*-text` + dùng `var()` trong AdminPage.css |
| SEO/OG/Structured data | 100% | — | OG image SVG + JSON-LD Organization/PhotographyBusiness/FAQPage/Article |
| Reveal on scroll + micro-interaction | 95% | Page transition | — |

> Cập nhật: 12/10/2026 (Section 5 hoàn thiện + responsive verified).
