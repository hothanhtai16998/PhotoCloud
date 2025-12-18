# PhotoCloud Bandwidth & CPU Cost Analysis

## 📊 Executive Summary

This document provides detailed bandwidth and CPU cost calculations for all major functions in PhotoCloud. Costs are calculated per operation and scaled to common usage patterns.

**Key Metrics:**
- **Average Image Size:** 3-5 MB (original)
- **Average User Session:** 10-15 minutes
- **Peak Concurrent Users:** 50-100
- **Daily Image Uploads:** 100-500

---

## 🖼️ Image Operations

### 1. Image Upload (`POST /api/images/upload`)

#### Bandwidth Cost:
- **Input (Client → Server):**
  - Original image: 3-5 MB (average)
  - Request headers: ~2 KB
  - **Total Upload: 3-5 MB per image**

- **Output (Server → Client):**
  - Response JSON: ~5 KB
  - **Total Download: 5 KB per upload**

- **Server → R2 Storage:**
  - Phase 1 (Critical formats):
    - Thumbnail (200x200 WebP): ~15 KB
    - Small (500x500 WebP): ~45 KB
    - Regular (1000x1000 WebP): ~120 KB
    - Full WebP: ~800 KB (average)
    - Original: 3-5 MB
    - Tiny PNG (20x20): ~1 KB
    - **Phase 1 Total: ~4-6 MB**
  
  - Phase 2 (Background AVIF):
    - Thumbnail AVIF: ~12 KB
    - Small AVIF: ~35 KB
    - Regular AVIF: ~90 KB
    - Full AVIF: ~600 KB
    - **Phase 2 Total: ~737 KB**

  - **Total Storage Upload: ~5-7 MB per image**

#### CPU Cost:
- **Sharp Operations (Phase 1):**
  - Tiny PNG (20x20): ~50ms CPU time
  - Thumbnail (200x200): ~150ms CPU time
  - Small (500x500): ~300ms CPU time
  - Regular (1000x1000): ~500ms CPU time
  - Full WebP conversion: ~800ms CPU time
  - **Total Phase 1: ~1.8 seconds CPU time** (parallel, but queued = ~2-3 seconds wall time)

- **Sharp Operations (Phase 2 - Background):**
  - Thumbnail AVIF: ~200ms CPU time
  - Small AVIF: ~400ms CPU time
  - Regular AVIF: ~700ms CPU time
  - Full AVIF: ~1.2 seconds CPU time
  - **Total Phase 2: ~2.5 seconds CPU time** (parallel = ~1.5 seconds wall time)

- **Metadata Extraction:**
  - EXIF parsing: ~100ms CPU time
  - Dominant colors: ~200ms CPU time
  - **Total: ~300ms CPU time**

- **AI Tagging:**
  - Google Vision API call: ~500-2000ms (network + processing)
  - Base64 encoding: ~50ms CPU time
  - **Total: ~500-2000ms** (mostly network latency)

- **Database Operations:**
  - Image document creation: ~50ms CPU time
  - Category lookup: ~20ms CPU time
  - **Total: ~70ms CPU time**

- **Total CPU Cost per Upload:**
  - Phase 1: ~2-3 seconds (blocking)
  - Phase 2: ~1.5 seconds (background)
  - Metadata: ~300ms
  - AI Tagging: ~500-2000ms (optional, can be async)
  - Database: ~70ms
  - **Total: ~4-7 seconds CPU time per image**

#### Cost per 100 Uploads:
- **Bandwidth:** 500-700 MB upload, 500 KB download
- **CPU Time:** 400-700 seconds (6.7-11.7 minutes)
- **Storage:** 500-700 MB

---

### 2. Image View/Download (`GET /api/images/:id`)

#### Bandwidth Cost:
- **Input:**
  - Request headers: ~1 KB
  - **Total: 1 KB**

- **Output:**
  - Response JSON: ~3-5 KB
  - **Total: 3-5 KB**

#### CPU Cost:
- **Database Query:**
  - Find image: ~20ms CPU time
  - Populate user: ~10ms CPU time
  - Populate category: ~10ms CPU time
  - **Total: ~40ms CPU time**

#### Cost per 1000 Views:
- **Bandwidth:** 3-5 MB
- **CPU Time:** 40 seconds

---

### 3. Image List/Feed (`GET /api/images`)

#### Bandwidth Cost:
- **Input:**
  - Request headers: ~1 KB
  - Query parameters: ~0.5 KB
  - **Total: 1.5 KB**

- **Output:**
  - Response JSON (20 images): ~50-80 KB
  - **Total: 50-80 KB per page**

#### CPU Cost:
- **Database Query:**
  - Find images: ~30ms CPU time
  - Populate users: ~50ms CPU time
  - Populate categories: ~30ms CPU time
  - Sort: ~10ms CPU time
  - **Total: ~120ms CPU time**

#### Cost per 1000 Page Loads:
- **Bandwidth:** 50-80 MB
- **CPU Time:** 120 seconds (2 minutes)

---

### 4. Image Search (`GET /api/search/images`)

#### Bandwidth Cost:
- **Input:**
  - Request headers: ~1 KB
  - Query string: ~0.5 KB
  - **Total: 1.5 KB**

- **Output:**
  - Response JSON (20 results): ~50-80 KB
  - **Total: 50-80 KB**

#### CPU Cost:
- **Database Query:**
  - Text search: ~100-500ms CPU time (depends on index)
  - Populate fields: ~50ms CPU time
  - **Total: ~150-550ms CPU time**

#### Cost per 1000 Searches:
- **Bandwidth:** 50-80 MB
- **CPU Time:** 150-550 seconds (2.5-9 minutes)

---

## 🎬 Video Operations

### 5. Video Upload (`POST /api/images/upload` - Video)

#### Bandwidth Cost:
- **Input (Client → Server):**
  - Original video: 10-50 MB (average)
  - Request headers: ~2 KB
  - **Total Upload: 10-50 MB per video**

- **Output (Server → Client):**
  - Response JSON: ~5 KB
  - **Total Download: 5 KB**

- **Server → R2 Storage:**
  - Original video: 10-50 MB
  - Thumbnail (200x200): ~15 KB
  - **Total: 10-50 MB per video**

#### CPU Cost:
- **Video Processing:**
  - Thumbnail generation: ~200ms CPU time
  - Metadata extraction: ~100ms CPU time
  - **Total: ~300ms CPU time**

- **Database Operations:**
  - Video document creation: ~50ms CPU time
  - **Total: ~50ms CPU time**

- **Total CPU Cost: ~350ms per video**

#### Cost per 100 Videos:
- **Bandwidth:** 1-5 GB upload, 500 KB download
- **CPU Time:** 35 seconds
- **Storage:** 1-5 GB

---

### 6. GIF to Video Conversion (`convertGifToVideo`)

#### Bandwidth Cost:
- **Input:**
  - GIF file: 2-50 MB
  - **Total: 2-50 MB**

- **Output:**
  - MP4 video: 1-30 MB (compressed)
  - Thumbnail: ~15 KB
  - **Total: 1-30 MB**

#### CPU Cost:
- **FFmpeg Conversion:**
  - Small GIF (2-5 MB): ~5-15 seconds CPU time
  - Medium GIF (5-15 MB): ~15-60 seconds CPU time
  - Large GIF (15-50 MB): ~60-300 seconds CPU time
  - **Average: ~30-120 seconds CPU time**

- **Thumbnail Generation:**
  - Extract frame: ~100ms CPU time
  - Resize: ~50ms CPU time
  - **Total: ~150ms CPU time**

- **Total CPU Cost: ~30-120 seconds per GIF**

#### Cost per 100 GIF Conversions:
- **Bandwidth:** 200-5000 MB input, 100-3000 MB output
- **CPU Time:** 3000-12000 seconds (50-200 minutes)
- **Storage:** 100-3000 MB

---

## 📁 Collection Operations

### 7. Create Collection (`POST /api/collections`)

#### Bandwidth Cost:
- **Input:**
  - Request body: ~1-2 KB
  - **Total: 1-2 KB**

- **Output:**
  - Response JSON: ~3-5 KB
  - **Total: 3-5 KB**

#### CPU Cost:
- **Database Operations:**
  - Create collection: ~30ms CPU time
  - Create version: ~20ms CPU time
  - Populate fields: ~20ms CPU time
  - Cache invalidation: ~5ms CPU time
  - **Total: ~75ms CPU time**

#### Cost per 100 Collections:
- **Bandwidth:** 100-200 KB upload, 300-500 KB download
- **CPU Time:** 7.5 seconds

---

### 8. Get User Collections (`GET /api/collections`)

#### Bandwidth Cost:
- **Input:**
  - Request headers: ~1 KB
  - **Total: 1 KB**

- **Output:**
  - Response JSON (with sample images): ~100-200 KB
  - **Total: 100-200 KB**

#### CPU Cost:
- **Database Query (Cached):**
  - Cache hit: ~1ms CPU time
  - Cache miss: ~200-500ms CPU time (aggregation with lookups)
  - **Average: ~50-250ms CPU time** (with 80% cache hit rate)

#### Cost per 1000 Requests:
- **Bandwidth:** 100-200 MB
- **CPU Time:** 50-250 seconds (with caching)

---

### 9. Get Collection Details (`GET /api/collections/:id`)

#### Bandwidth Cost:
- **Input:**
  - Request headers: ~1 KB
  - **Total: 1 KB**

- **Output:**
  - Response JSON (with all images): ~500 KB - 2 MB (depends on image count)
  - **Total: 500 KB - 2 MB**

#### CPU Cost:
- **Database Query:**
  - Find collection: ~20ms CPU time
  - Populate createdBy: ~10ms CPU time
  - Populate coverImage: ~10ms CPU time
  - Populate collaborators (2 levels): ~50ms CPU time
  - Populate images (with nested populate): ~200-1000ms CPU time (depends on image count)
  - **Total: ~290-1090ms CPU time**

#### Cost per 1000 Views:
- **Bandwidth:** 500 MB - 2 GB
- **CPU Time:** 290-1090 seconds (5-18 minutes)

---

## 👤 User Operations

### 10. User Registration (`POST /api/auth/register`)

#### Bandwidth Cost:
- **Input:**
  - Request body: ~1-2 KB
  - **Total: 1-2 KB**

- **Output:**
  - Response JSON: ~2-3 KB
  - **Total: 2-3 KB**

#### CPU Cost:
- **Password Hashing:**
  - bcrypt (10 rounds): ~100-200ms CPU time
  - **Total: ~100-200ms CPU time**

- **Database Operations:**
  - Create user: ~30ms CPU time
  - Check duplicates: ~20ms CPU time
  - **Total: ~50ms CPU time**

- **Total CPU Cost: ~150-250ms per registration**

#### Cost per 100 Registrations:
- **Bandwidth:** 100-200 KB upload, 200-300 KB download
- **CPU Time:** 15-25 seconds

---

### 11. User Login (`POST /api/auth/login`)

#### Bandwidth Cost:
- **Input:**
  - Request body: ~0.5 KB
  - **Total: 0.5 KB**

- **Output:**
  - Response JSON: ~3-5 KB
  - JWT token: ~1 KB
  - **Total: 4-6 KB**

#### CPU Cost:
- **Password Verification:**
  - bcrypt compare: ~100-200ms CPU time
  - **Total: ~100-200ms CPU time**

- **Database Operations:**
  - Find user: ~20ms CPU time
  - Update lastLogin: ~10ms CPU time
  - **Total: ~30ms CPU time**

- **JWT Generation:**
  - Sign token: ~5ms CPU time
  - **Total: ~5ms CPU time**

- **Total CPU Cost: ~135-235ms per login**

#### Cost per 1000 Logins:
- **Bandwidth:** 500 KB upload, 4-6 MB download
- **CPU Time:** 135-235 seconds (2-4 minutes)

---

### 12. Get User Profile (`GET /api/users/:id`)

#### Bandwidth Cost:
- **Input:**
  - Request headers: ~1 KB
  - **Total: 1 KB**

- **Output:**
  - Response JSON: ~5-10 KB
  - **Total: 5-10 KB**

#### CPU Cost:
- **Database Query:**
  - Find user: ~20ms CPU time
  - Populate stats: ~30ms CPU time
  - **Total: ~50ms CPU time**

#### Cost per 1000 Profile Views:
- **Bandwidth:** 5-10 MB
- **CPU Time:** 50 seconds

---

## 🔔 Notification Operations

### 13. Get Notifications (`GET /api/notifications`)

#### Bandwidth Cost:
- **Input:**
  - Request headers: ~1 KB
  - Query parameters: ~0.5 KB
  - **Total: 1.5 KB**

- **Output:**
  - Response JSON (20 notifications): ~30-50 KB
  - **Total: 30-50 KB**

#### CPU Cost:
- **Database Query:**
  - Find notifications: ~30ms CPU time
  - Populate related data: ~40ms CPU time
  - Sort: ~10ms CPU time
  - **Total: ~80ms CPU time**

#### Cost per 1000 Requests:
- **Bandwidth:** 30-50 MB
- **CPU Time:** 80 seconds

---

### 14. Notification Polling (Fallback)

#### Bandwidth Cost:
- **Per Poll:**
  - Request: ~1 KB
  - Response: ~1 KB (unread count)
  - **Total: 2 KB per poll**

- **Frequency:** Every 1.5 seconds (when WebSocket not connected)
- **Per Hour:** 2400 polls = 4.8 MB
- **Per Day (8 hours active):** 38.4 MB per user

#### CPU Cost:
- **Per Poll:**
  - Database query: ~20ms CPU time
  - **Total: ~20ms CPU time**

- **Per Hour:** 48 seconds CPU time
- **Per Day (8 hours):** 384 seconds (6.4 minutes) CPU time per user

---

## 🔍 Search Operations

### 15. Image Search (`GET /api/search/images`)

#### Bandwidth Cost:
- **Input:**
  - Request headers: ~1 KB
  - Query string: ~0.5 KB
  - **Total: 1.5 KB**

- **Output:**
  - Response JSON (20 results): ~50-80 KB
  - **Total: 50-80 KB**

#### CPU Cost:
- **Database Query:**
  - Text search (indexed): ~100-500ms CPU time
  - Populate fields: ~50ms CPU time
  - **Total: ~150-550ms CPU time**

#### Cost per 1000 Searches:
- **Bandwidth:** 50-80 MB
- **CPU Time:** 150-550 seconds (2.5-9 minutes)

---

## ⭐ Favorite Operations

### 16. Add Favorite (`POST /api/favorites`)

#### Bandwidth Cost:
- **Input:**
  - Request body: ~0.5 KB
  - **Total: 0.5 KB**

- **Output:**
  - Response JSON: ~2 KB
  - **Total: 2 KB**

#### CPU Cost:
- **Database Operations:**
  - Check existing: ~20ms CPU time
  - Create favorite: ~30ms CPU time
  - Update image stats: ~20ms CPU time
  - **Total: ~70ms CPU time**

- **WebSocket Notification:**
  - Emit event: ~5ms CPU time
  - **Total: ~5ms CPU time**

- **Total CPU Cost: ~75ms per favorite**

#### Cost per 1000 Favorites:
- **Bandwidth:** 500 KB upload, 2 MB download
- **CPU Time:** 75 seconds

---

## 📊 Admin Operations

### 17. Get Analytics (`GET /api/admin/analytics`)

#### Bandwidth Cost:
- **Input:**
  - Request headers: ~1 KB
  - Query parameters: ~0.5 KB
  - **Total: 1.5 KB**

- **Output:**
  - Response JSON: ~200-500 KB (depends on date range)
  - **Total: 200-500 KB**

#### CPU Cost:
- **Database Aggregations:**
  - Daily users: ~500-2000ms CPU time
  - Daily uploads: ~500-2000ms CPU time
  - Daily pending: ~300-1000ms CPU time
  - Daily approved: ~300-1000ms CPU time
  - Top uploaders: ~200ms CPU time
  - Categories: ~100ms CPU time
  - **Total: ~1900-6300ms CPU time**

#### Cost per 100 Requests:
- **Bandwidth:** 20-50 MB
- **CPU Time:** 190-630 seconds (3-10 minutes)

---

### 18. Get WebSocket Metrics (`GET /api/admin/dashboard/websocket-metrics`)

#### Bandwidth Cost:
- **Input:**
  - Request headers: ~1 KB
  - **Total: 1 KB**

- **Output:**
  - Response JSON: ~10-20 KB
  - **Total: 10-20 KB**

#### CPU Cost:
- **Metrics Calculation:**
  - Calculate stats: ~50-100ms CPU time
  - Format data: ~10ms CPU time
  - **Total: ~60-110ms CPU time**

#### Cost per 1000 Requests (polling every 5s):
- **Bandwidth:** 10-20 MB
- **CPU Time:** 60-110 seconds

---

## 🌐 WebSocket Operations

### 19. WebSocket Connection

#### Bandwidth Cost:
- **Initial Connection:**
  - Handshake: ~2 KB
  - Authentication: ~1 KB
  - **Total: 3 KB per connection**

- **Per Event:**
  - Event payload: ~200-500 bytes
  - **Total: ~200-500 bytes per event**

- **Per Hour (Active User):**
  - Keep-alive: ~1 KB
  - Events: ~50-100 events = 10-50 KB
  - **Total: ~11-51 KB per hour**

#### CPU Cost:
- **Connection Setup:**
  - JWT verification: ~5ms CPU time
  - Room setup: ~10ms CPU time
  - **Total: ~15ms CPU time**

- **Per Event:**
  - Event processing: ~1-5ms CPU time
  - Room lookup: ~1ms CPU time
  - Emit: ~2ms CPU time
  - **Total: ~4-8ms CPU time per event**

- **Per Hour (Active User):**
  - Connection: 15ms
  - Events (50-100): 200-800ms
  - **Total: ~215-815ms CPU time per hour**

---

## 📈 Daily Cost Estimates

### Scenario: 500 Daily Active Users, 100 Image Uploads

#### Bandwidth:
- **Image Uploads:** 100 × 5 MB = 500 MB
- **Image Views:** 10,000 × 80 KB = 800 MB
- **Collection Views:** 2,000 × 200 KB = 400 MB
- **Search:** 1,000 × 80 KB = 80 MB
- **Notifications:** 5,000 × 50 KB = 250 MB
- **WebSocket:** 500 × 50 KB = 25 MB
- **Admin:** 100 × 500 KB = 50 MB
- **Other:** 200 MB
- **Total Daily Bandwidth: ~2.3 GB**

#### CPU Time:
- **Image Uploads:** 100 × 5s = 500s (8.3 min)
- **Image Views:** 10,000 × 0.04s = 400s (6.7 min)
- **Collection Views:** 2,000 × 0.5s = 1,000s (16.7 min)
- **Search:** 1,000 × 0.3s = 300s (5 min)
- **Notifications:** 5,000 × 0.08s = 400s (6.7 min)
- **WebSocket:** 500 × 0.5s = 250s (4.2 min)
- **Admin:** 100 × 4s = 400s (6.7 min)
- **Other:** 200s (3.3 min)
- **Total Daily CPU Time: ~3,450 seconds (57.5 minutes)**

#### Monthly Estimates:
- **Bandwidth:** ~69 GB/month
- **CPU Time:** ~28.75 hours/month
- **Storage:** ~150-350 GB/month (images)

---

## 💰 Cost Breakdown by Operation Type

### High Bandwidth Operations:
1. **Image Upload:** 3-7 MB per operation
2. **Video Upload:** 10-50 MB per operation
3. **GIF Conversion:** 2-50 MB input, 1-30 MB output
4. **Collection Details:** 500 KB - 2 MB per view

### High CPU Operations:
1. **GIF to Video Conversion:** 30-120 seconds per operation
2. **Image Processing (Phase 1):** 2-3 seconds per image
3. **Image Processing (Phase 2 - AVIF):** 1.5 seconds per image
4. **AI Tagging:** 0.5-2 seconds per image
5. **Analytics Aggregation:** 1.9-6.3 seconds per request

### Low Cost Operations:
1. **User Login:** 135-235ms CPU, 4-6 KB bandwidth
2. **Get Notifications:** 80ms CPU, 30-50 KB bandwidth
3. **Add Favorite:** 75ms CPU, 2.5 KB bandwidth
4. **WebSocket Events:** 4-8ms CPU, 200-500 bytes bandwidth

---

## 🎯 Optimization Recommendations

### Bandwidth Optimization:
1. **Enable CDN** for static assets (images, videos)
2. **Implement image lazy loading** on frontend
3. **Use WebP/AVIF** formats (already implemented)
4. **Compress API responses** (gzip/brotli)
5. **Implement pagination** for large lists

### CPU Optimization:
1. **Image processing queue** (already implemented)
2. **Database query caching** (already implemented)
3. **Move AI tagging to background** (async processing)
4. **Optimize database indexes** for frequent queries
5. **Use worker threads** for heavy computations (partially implemented)

---

## 📝 Notes

- All CPU times are approximate and depend on:
  - Server hardware (CPU cores, speed)
  - Image/video size and complexity
  - Database size and index quality
  - Network latency (for external APIs)
  - Concurrent load

- Bandwidth costs include:
  - Request/response headers
  - JSON payloads
  - File uploads/downloads
  - WebSocket messages

- Storage costs are separate and not included in bandwidth calculations

- Costs scale linearly with usage (except for cached operations)

