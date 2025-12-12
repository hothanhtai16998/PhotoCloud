# Fix Content-Security-Policy (CSP) Errors

## Problem

You're seeing CSP errors in the browser console:
```
Content-Security-Policy: The page's settings blocked the loading of a resource (connect-src) 
at `https://api.uploadanh.cloud/api/...` because it violates the following directive: 
"connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com"
```

**What this means:**
- The CSP (Content Security Policy) is blocking all API requests to your backend
- The `connect-src` directive only allows connections to `'self'` and Google Fonts
- It does NOT include `https://api.uploadanh.cloud`, so all API calls are blocked

## Root Cause

The CSP meta tag in `frontend/index.html` was too restrictive. It only allowed:
- `'self'` (same origin)
- `https://fonts.googleapis.com`
- `https://fonts.gstatic.com`

But it didn't include your backend API domain: `https://api.uploadanh.cloud`

## Solution Applied

I've updated the CSP meta tag in `frontend/index.html` to include:
- `https://api.uploadanh.cloud` - Your backend API
- `https://nominatim.openstreetmap.org` - Location services (if used)

## What You Need to Do

1. **Rebuild and redeploy your frontend:**
   ```bash
   cd frontend
   npm run build
   ```
   Then push to trigger a new Cloudflare Pages deployment.

2. **Verify it's working:**
   - Open your site in a browser
   - Open Developer Tools (F12) → Console tab
   - You should **NOT** see CSP errors anymore
   - API requests should work (images should load)

## Updated CSP Policy

The new CSP allows:
- **connect-src**: `'self'`, `https://api.uploadanh.cloud`, `https://fonts.googleapis.com`, `https://fonts.gstatic.com`, `https://nominatim.openstreetmap.org`
- **font-src**: `'self'`, `data:`, `https://fonts.gstatic.com`, `https://fonts.googleapis.com`
- **style-src**: `'self'`, `'unsafe-inline'`, `https://fonts.googleapis.com`

## If You Still See CSP Errors

1. **Clear browser cache** - Old CSP might be cached
2. **Hard refresh** - Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. **Check the deployed HTML** - Verify the CSP meta tag includes `https://api.uploadanh.cloud`
4. **Check for other CSP sources** - Cloudflare Pages might have additional CSP settings

## Additional Notes

- Images from R2 storage are loaded via `<img>` tags, so they're controlled by `imgSrc` (which already allows `https:`)
- The CSP only affects `fetch()` and XHR requests (controlled by `connect-src`)
- If you add new external APIs, you'll need to add them to the `connect-src` directive

## Summary

**The fix:** Updated CSP meta tag to include `https://api.uploadanh.cloud` in `connect-src`

**Next step:** Rebuild and redeploy your frontend

After redeployment, all API requests should work and images should load!

