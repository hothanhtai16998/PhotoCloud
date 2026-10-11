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

> Tất cả token đã khai báo trong `src/index.css` (`--studio-*`).

- [x] Nền chính `#FAF8F4` (`--studio-bg-warm`) — đã dùng cho các section branded.
- [x] Nền phụ `#F2EEE7` (`--studio-bg-cream`) — token có, đã dùng rải rác.
- [x] Text chính `#1B1B19` (`--studio-text-primary`) — token có, dùng cho CTA/H.
- [x] Text phụ `#6B6B66` (`--studio-text-muted`) — token có, dùng cho mô tả.
- [x] Accent chính (CTA) đen đặc — `studio-cta-primary` pill đen.
- [x] Accent phụ đồng `#B8865B` (`--studio-accent-copper`) — dùng cho hover/focus ring.
- [x] Trạng thái Confirmed `#7A8B5C` (`--studio-status-confirmed`) — token có, **chưa áp dụng** cho `.booking-status-confirmed` (hiện đang dùng `#e5f5e9`/`#23733b` trong `AdminPage.css:346`).
- [x] Trạng thái Pending `#C9A14A` (`--studio-status-pending`) — token có, **chưa áp dụng** (hiện `#fff5d7`/`#8b6500`).
- [x] Trạng thái Danger `#A6453C` (`--studio-status-danger`) — token có, **chưa áp dụng** (hiện `#fde8e8`/`#a12727`).
- [x] Viền nhẹ `#E8E2D6` (`--studio-border-soft`) — đã dùng cho card.
- [x] Rating vàng đồng — token có sẵn trong component.
- [x] Display font **Fraunces** — đã import trong `index.css:2` + khai báo `--studio-font-display`.
- [x] Body font **Inter** — đã import, khai báo `--studio-font-body`.
- [~] Chưa gắn Fraunces cho `Hero`, `BookingPage`, `AboutPage` (`HeroBooking.tsx` hiện dùng `studio-display` cho `em`, cần áp cho cả `h1`).

---

## 3. Cấu trúc trang (Site Map)

### 3.1 Trang khách (chưa đăng nhập)

| # | Trang | Đường dẫn | Trạng thái |
|---|---|---|---|
| 1 | Trang chủ | `/` | [x] `HomePage.tsx` |
| 2 | Khám phá (Explore) | `/explore` | [ ] **Chưa có** — dùng `/t/:categorySlug` thay thế |
| 3 | Trang ảnh | `/photo/:id` | [x] `ImagePage.tsx` (route `/photos/:slug`) |
| 4 | Bộ sưu tập | `/collections` & `/collections/:id` | [x] `CollectionsPage.tsx` + `CollectionDetailPage.tsx` |
| 5 | Gói chụp (Packages) | `/packages` | [ ] **Chưa có trang riêng** — chỉ hiển thị ở homepage + booking modal |
| 6 | Chi tiết gói | `/packages/:slug` | [ ] **Chưa có** |
| 7 | Đặt lịch (Booking) | `/booking` | [x] `BookingPage.tsx` |
| 8 | Blog/Concept | `/blog` & `/blog/:slug` | [ ] **Chưa có** |
| 9 | About | `/about` | [~] `AboutPage.tsx` hiện chỉ là contact info, **chưa có** story, số liệu, đội ngũ, giá trị cốt lõi |
| 10 | Liên hệ | `/contact` | [ ] **Chưa có trang riêng** — chỉ có `ContactButton` floating + `AboutPage` |
| 11 | Đăng nhập / Đăng ký | `/auth/signin`, `/auth/signup` | [x] `SignInPage.tsx`, `SignUpPage.tsx` (route `/signin`, `/signup`) |

### 3.2 Trang thành viên

| # | Trang | Đường dẫn | Trạng thái |
|---|---|---|---|
| 12 | Hồ sơ (Profile) | `/:username` | [x] `ProfilePage.tsx` |
| 13 | Chỉnh sửa hồ sơ | `/settings/profile` | [~] Có `/profile/edit` (đổi route đề xuất brief) |
| 14 | Upload | `/upload` | [x] `UploadPage.tsx` |
| 15 | Yêu thích ảnh | `/favorites/photos` | [~] Có `/favorites` (gom) |
| 16 | Yêu thích collection | `/favorites/collections` | [x] `FavoriteCollectionsPage.tsx` |
| 17 | Lịch đặt của tôi | `/profile/bookings` | [~] Có tab bookings trong `ProfilePage` nhưng **chưa có filter chip, chưa phân nhóm, chưa countdown, chưa nút "Yêu cầu đổi lịch"** |
| 18 | Gói đã lưu (Wishlist) | `/profile/saved-packages` | [ ] **Chưa có** (chưa có wishlist gói) |
| 19 | Thông báo | `/notifications` | [~] Có `NotificationBell` trong header nhưng chưa có trang `/notifications` riêng |

### 3.3 Trang admin

| # | Trang | Đường dẫn | Trạng thái |
|---|---|---|---|
| 20 | Admin Dashboard | `/admin` | [x] `AdminPage.tsx` + `AdminDashboard.tsx` |
| 21 | Quản lý Booking | `/admin/bookings` | [x] Tab trong `AdminBookings.tsx` |
| 22 | Calendar | `/admin/calendar` | [x] View "Lịch" trong `AdminBookings.tsx` (month/week/day) |
| 23 | Quản lý Ảnh | `/admin/images` | [x] `AdminImages.tsx` |
| 24 | Quản lý danh mục | `/admin/categories` | [x] `AdminCategories.tsx` |
| 25 | Quản lý gói | `/admin/packages` | [x] View "Gói chụp" trong `AdminBookings.tsx` |
| 26 | Analytics | `/admin/analytics` | [x] `AdminAnalytics.tsx` + `AdminTrafficAnalytics.tsx` |
| 27 | Logs | `/admin/logs` | [x] `AdminLogs.tsx` |
| 28 | Settings | `/admin/settings` | [x] `AdminSettings.tsx` |

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
