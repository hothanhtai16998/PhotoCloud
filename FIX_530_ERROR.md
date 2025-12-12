# Fix HTTP 530 Error - Cloudflare Pages Cannot Reach Backend

## Problem

You're seeing HTTP 530 errors in the browser console:
- `AxiosError: Request failed with status code 530`
- `ERR_BAD_RESPONSE`
- All API requests failing

**What HTTP 530 means:**
- Cloudflare Pages cannot reach your backend server
- The `_redirects` proxy is failing
- The origin server (backend) is unreachable or timing out

## Root Cause

Cloudflare Pages `_redirects` file only works for GET requests and has limitations:
1. It's a simple proxy that may fail if the backend is slow to respond
2. It doesn't handle all HTTP methods properly
3. It can't reach backends behind certain firewalls or with specific configurations

## Solution: Use Direct Backend URL

Instead of using the `_redirects` proxy, configure the frontend to connect directly to your backend.

### Step 1: Set Environment Variable in Cloudflare Pages

1. Go to **Cloudflare Dashboard** → **Pages** → **Your Project**
2. Click **Settings** → **Environment Variables**
3. Click **Add variable**
4. Set:
   - **Variable name**: `VITE_API_URL`
   - **Value**: `https://api.uploadanh.cloud/api`
   - **Environment**: Production (and Preview if needed)
5. Click **Save**

### Step 2: Redeploy Your Site

After setting the environment variable:
1. Go to **Deployments** tab
2. Click **Retry deployment** on the latest deployment, OR
3. Push a new commit to trigger a new deployment

The environment variable will be available during the build process.

### Step 3: Verify It's Working

1. Open your site in a browser
2. Open Developer Tools (F12) → **Console** tab
3. You should **NOT** see the warning: "VITE_API_URL not set"
4. Check **Network** tab - API requests should go to `https://api.uploadanh.cloud/api` directly
5. No more 530 errors!

## Alternative: Code Already Has Fallback

The code has been updated to automatically use the direct backend URL on Cloudflare Pages if `VITE_API_URL` is not set. However, **it's still recommended to set the environment variable** for:
- Better control
- Ability to change backend URL without code changes
- Different URLs for preview/production environments

## Verify Backend is Running

Before fixing the frontend, make sure your backend is actually running:

```bash
# Test backend health endpoint
curl https://api.uploadanh.cloud/api/health

# Should return: {"status":"ok",...}
```

If this fails, your backend is down and needs to be fixed first.

## Troubleshooting

### Still Getting 530 Errors After Setting VITE_API_URL?

1. **Check environment variable is set correctly:**
   - Variable name must be exactly: `VITE_API_URL`
   - Value must include `/api` at the end: `https://api.uploadanh.cloud/api`
   - Make sure it's set for the correct environment (Production/Preview)

2. **Verify backend is accessible:**
   ```bash
   curl https://api.uploadanh.cloud/api/health
   ```

3. **Check backend CORS settings:**
   - Backend `CLIENT_URL` must match your frontend domain
   - Should be: `CLIENT_URL=https://your-frontend-domain.com`

4. **Check backend logs:**
   - Look for connection errors
   - Verify backend is listening on the correct port
   - Check if backend is behind a firewall

### Backend Returns 530 When Accessed Directly?

If `curl https://api.uploadanh.cloud/api/health` returns 530:
- Your backend server is down or unreachable
- Check Railway/Render logs
- Verify backend is running and healthy
- Check if backend domain DNS is configured correctly

### CORS Errors After Fixing 530?

If you see CORS errors instead:
1. Check backend `CLIENT_URL` environment variable
2. Must match your frontend domain exactly (including `https://`)
3. Restart backend after changing environment variables

## Quick Checklist

- [ ] Backend is running and accessible (`curl https://api.uploadanh.cloud/api/health`)
- [ ] `VITE_API_URL` environment variable is set in Cloudflare Pages
- [ ] Environment variable value is: `https://api.uploadanh.cloud/api`
- [ ] Site has been redeployed after setting environment variable
- [ ] Backend `CLIENT_URL` matches frontend domain
- [ ] No more 530 errors in browser console
- [ ] API requests work (images load, etc.)

## Summary

**The fix is simple:**
1. Set `VITE_API_URL=https://api.uploadanh.cloud/api` in Cloudflare Pages
2. Redeploy your site
3. Done!

This makes the frontend connect directly to your backend instead of using the unreliable `_redirects` proxy.

