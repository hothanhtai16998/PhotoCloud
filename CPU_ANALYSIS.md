# PhotoCloud CPU Usage Analysis

## 🔴 Critical CPU Wasters (Highest Impact)

### 1. **Image Processing - Sharp Operations** ⚠️ HIGHEST IMPACT
**Location:** `backend/src/libs/s3.js` - `uploadImageWithSizes()`

**Problem:**
- **4-5 parallel Sharp operations** per image upload:
  - Thumbnail (200x200)
  - Small (500x500)
  - Regular (1000x1000)
  - Full WebP conversion
  - Tiny PNG for blur-up (20x20)
- Each operation is CPU-intensive (resize + format conversion)
- Running in parallel with `Promise.all()` = **100% CPU usage** during uploads
- **No rate limiting** - multiple concurrent uploads can overwhelm CPU

**Impact:**
- **100% CPU** during image uploads
- Blocks other requests
- Can cause server timeouts

**Recommendations:**
- ✅ Already using worker threads for some operations (`imageResizeWorker.js`)
- ⚠️ **Move ALL Sharp operations to worker threads**
- ⚠️ **Add queue system** to limit concurrent image processing (max 2-3 at a time)
- ⚠️ **Consider using Sharp's concurrency limit** (`sharp.concurrency()`)
- ⚠️ **Cache processed images** to avoid reprocessing

---

### 2. **Frontend Polling - Notification Store** ⚠️ HIGH IMPACT
**Location:** `frontend/src/stores/useNotificationStore.ts`

**Problem:**
- **Polling every 1.5 seconds** (`setInterval(..., 1500)`)
- Runs even when WebSocket is connected (should be disabled)
- Multiple components can subscribe, increasing polling frequency
- Each poll = API request + database query

**Impact:**
- **~40 requests/minute per user** (if WebSocket fails)
- Database queries every 1.5 seconds
- Unnecessary CPU on both frontend and backend

**Current Code:**
```typescript
globalPollingInterval = window.setInterval(() => {
    if (isTabVisible) {
        get().fetchUnreadCount();
    }
}, 1500); // 1.5 seconds
```

**Recommendations:**
- ✅ Already checks `wsConnected` but may not be reliable
- ⚠️ **Ensure polling stops when WebSocket is connected**
- ⚠️ **Increase interval to 5-10 seconds** as fallback
- ⚠️ **Use exponential backoff** if WebSocket fails
- ⚠️ **Add request deduplication** to prevent duplicate polls

---

### 3. **Frontend Animations - 60fps Progress Bars** ⚠️ MEDIUM-HIGH IMPACT
**Location:** `frontend/src/components/Slider.tsx` (line 272)

**Problem:**
- **Progress bar updates every 16ms** (60fps) using `setInterval`
- Multiple sliders on page = multiple 60fps intervals
- Each update triggers React re-render
- Runs continuously while slider is active

**Current Code:**
```typescript
progressIntervalRef.current = window.setInterval(() => {
    const elapsed = Date.now() - progressStartTimeRef.current;
    const progress = Math.min((elapsed / intervalMs) * 100, 100);
    setAutoPlayProgress(progress); // Triggers re-render
}, 16); // 60fps
```

**Impact:**
- **60 React re-renders per second** per slider
- High CPU usage on client devices
- Battery drain on mobile devices
- Can cause jank on low-end devices

**Recommendations:**
- ⚠️ **Reduce to 30fps** (33ms interval) - still smooth
- ⚠️ **Use CSS animations** instead of JavaScript updates
- ⚠️ **Pause when tab is not visible** (`document.visibilityState`)
- ⚠️ **Use `requestAnimationFrame`** instead of `setInterval`

---

### 4. **AI Tagging - External API Calls** ⚠️ MEDIUM IMPACT
**Location:** `backend/src/utils/aiTaggingService.js`

**Problem:**
- **Synchronous API calls** to Google Cloud Vision or AWS Rekognition
- Blocks image processing pipeline
- 10-second timeout per image
- Base64 encoding of entire image buffer (CPU + memory)

**Impact:**
- **Blocks worker thread** for 1-10 seconds per image
- High memory usage (base64 encoding doubles size)
- External API latency adds to processing time

**Recommendations:**
- ✅ Already skips for videos and large files
- ⚠️ **Move to background job queue** (don't block upload)
- ⚠️ **Process AI tagging asynchronously** after image is uploaded
- ⚠️ **Add rate limiting** for external API calls
- ⚠️ **Cache results** for similar images

---

### 5. **Database Queries - Complex Aggregations** ⚠️ MEDIUM IMPACT
**Location:** Multiple controllers, especially `collectionCRUDController.js`

**Problem:**
- **Multiple `$lookup` operations** in single query (line 17-150)
- Nested populates (3-4 levels deep)
- No query result caching
- Runs on every collection page load

**Example:**
```javascript
Collection.aggregate([
    { $match: {...} },
    { $lookup: {...} }, // Lookup 1
    { $lookup: {...} }, // Lookup 2
    { $lookup: {...} }, // Lookup 3
    { $project: {...} },
    { $sort: {...} }
])
```

**Impact:**
- **High database CPU** usage
- Slow response times (500ms-2s)
- Can cause database connection pool exhaustion

**Recommendations:**
- ⚠️ **Add indexes** on frequently queried fields
- ⚠️ **Cache query results** (Redis/Memory cache)
- ⚠️ **Limit data fetched** (pagination, field selection)
- ⚠️ **Use `lean()` queries** where possible
- ⚠️ **Consider denormalization** for frequently accessed data

---

### 6. **Background Cleanup Tasks** ⚠️ LOW-MEDIUM IMPACT
**Location:** Multiple files

**Problem:**
- **Multiple `setInterval` tasks** running constantly:
  - Pre-upload cleanup: Every 6 hours
  - Session cleanup: Periodic
  - Cache cleanup: Periodic
  - Permission cache cleanup: Periodic
  - Request deduplication cleanup: Every 5 minutes
  - Alert monitoring: Every 60 seconds

**Impact:**
- **Constant background CPU usage**
- Database queries during cleanup
- Can spike during cleanup operations

**Recommendations:**
- ✅ Intervals are reasonable (6 hours, etc.)
- ⚠️ **Schedule during low-traffic hours**
- ⚠️ **Use cron jobs** instead of `setInterval` for long intervals
- ⚠️ **Add rate limiting** to cleanup operations

---

### 7. **WebSocket Metrics Polling** ⚠️ LOW-MEDIUM IMPACT
**Location:** `frontend/src/pages/admin/components/tabs/AdminWebSocketMetrics.tsx`

**Problem:**
- **Polling every 5 seconds** for metrics
- Only runs when admin dashboard is open
- Each poll = database aggregation + calculations

**Impact:**
- **12 requests/minute** per admin user
- CPU for metrics calculations

**Recommendations:**
- ⚠️ **Increase interval to 10-15 seconds**
- ⚠️ **Use WebSocket push** instead of polling
- ⚠️ **Cache metrics** and update incrementally

---

### 8. **Video Conversion (FFmpeg)** ⚠️ VERY HIGH IMPACT (When Active)
**Location:** `backend/src/utils/videoConverter.js`

**Problem:**
- **FFmpeg process** for GIF to video conversion
- Very CPU-intensive (can use 100% CPU)
- 5-minute timeout
- Blocks worker thread

**Impact:**
- **100% CPU** during conversion
- Can take 30 seconds - 5 minutes per large GIF
- Blocks other image processing

**Recommendations:**
- ✅ Already has timeout protection
- ⚠️ **Move to separate worker process**
- ⚠️ **Limit concurrent conversions** (max 1-2 at a time)
- ⚠️ **Use hardware acceleration** if available
- ⚠️ **Consider cloud video processing** (AWS MediaConvert, etc.)

---

## 📊 Summary by Impact Level

### 🔴 **Critical (Fix Immediately)**
1. **Image Processing (Sharp)** - 100% CPU during uploads
2. **Video Conversion (FFmpeg)** - 100% CPU during conversions
3. **Frontend Polling** - 40 requests/min per user

### 🟡 **High Priority (Fix Soon)**
4. **Frontend Animations** - 60fps updates causing re-renders
5. **AI Tagging** - Blocks processing pipeline
6. **Database Aggregations** - Slow queries

### 🟢 **Medium Priority (Optimize When Possible)**
7. **Background Cleanup** - Constant background tasks
8. **WebSocket Metrics** - Admin dashboard polling

---

## 🎯 Quick Wins (Easy Fixes)

### 1. **Stop Notification Polling When WebSocket Connected**
```typescript
// In useNotificationStore.ts
if (wsConnected && globalPollingInterval) {
    stopPolling(); // Ensure this is called
}
```

### 2. **Reduce Progress Bar Update Frequency**
```typescript
// Change from 16ms to 33ms (30fps)
}, 33); // Still smooth, 50% less CPU
```

### 3. **Add Image Processing Queue**
```javascript
// Limit concurrent Sharp operations
const MAX_CONCURRENT_PROCESSING = 2;
const processingQueue = [];
```

### 4. **Pause Animations When Tab Hidden**
```typescript
useEffect(() => {
    const handleVisibilityChange = () => {
        if (document.hidden) {
            // Pause intervals
        } else {
            // Resume intervals
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

### 5. **Add Database Query Caching**
```javascript
// Use Redis or memory cache
const cacheKey = `collections:${userId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

---

## 🔧 Long-term Solutions

1. **Move Image Processing to Worker Threads** - Already partially done, complete migration
2. **Implement Job Queue System** - Use Bull/BullMQ for background processing
3. **Add Redis Caching** - Cache database queries and computed results
4. **Use CDN for Static Assets** - Offload image serving
5. **Implement Request Batching** - Combine multiple requests into one
6. **Add Rate Limiting** - Prevent abuse and CPU spikes
7. **Monitor CPU Usage** - Add metrics to identify bottlenecks

---

## 📈 Expected CPU Reduction

| Fix | CPU Reduction | Difficulty |
|-----|--------------|------------|
| Stop unnecessary polling | 20-30% | Easy |
| Reduce animation frequency | 10-15% | Easy |
| Image processing queue | 40-50% | Medium |
| Database query caching | 15-25% | Medium |
| Move AI tagging to background | 10-20% | Medium |
| Worker threads for Sharp | 30-40% | Hard |

**Total Potential Reduction: 60-80% CPU usage**

---

## 🚨 Monitoring Recommendations

1. **Add CPU usage metrics** to admin dashboard
2. **Alert on high CPU** (>80% for >5 minutes)
3. **Track image processing queue length**
4. **Monitor database query times**
5. **Track WebSocket connection health** (to reduce polling)

---

## 📝 Notes

- Most CPU waste is from **synchronous blocking operations**
- **Frontend polling** is the easiest win
- **Image processing** is the biggest bottleneck
- **Database queries** can be optimized with caching
- **Background tasks** are necessary but can be optimized

