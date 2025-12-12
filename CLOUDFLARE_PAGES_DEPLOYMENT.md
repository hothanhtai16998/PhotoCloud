# 🚀 Cloudflare Pages Deployment Guide

Step-by-step guide to deploy your PhotoCloud frontend to Cloudflare Pages.

---

## ✅ Prerequisites

- ✅ GitHub repository with your code
- ✅ Cloudflare account (free)
- ✅ Backend deployed on Railway at `https://api.uploadanh.cloud`
- ✅ `_redirects` file already configured ✅

---

## 📋 Step-by-Step Deployment

### Step 1: Sign Up / Sign In to Cloudflare Pages

1. Go to **https://pages.cloudflare.com**
2. Sign in with your Cloudflare account (or create one for free)
3. Click **"Create a project"** or **"Connect to Git"**

---

### Step 2: Connect Your GitHub Repository

1. Click **"Connect to Git"** or **"Create a project"**
2. Select **GitHub** as your Git provider
3. Authorize Cloudflare Pages to access your repositories
4. Select your **PhotoCloud repository**
5. Click **"Begin setup"**

---

### Step 3: Configure Build Settings

Fill in the following:

#### Project Name
- **Name**: `photocloud` (or any name you prefer)

#### Build Settings
- **Framework preset**: Select **"Vite"** from the dropdown
  - If Vite is not available, select **"None"** and configure manually

#### Build Configuration
- **Root directory**: Leave empty (or `/`)
- **Build command**: 
  ```
  cd frontend && npm run build
  ```
- **Build output directory**: 
  ```
  frontend/dist
  ```

#### Environment Variables (Production)
- Click **"Add variable"**
- **Variable name**: `VITE_API_URL`
- **Value**: `https://api.uploadanh.cloud/api`
- (Optional - only needed if not using proxy)

---

### Step 4: Deploy

1. Click **"Save and Deploy"**
2. Cloudflare will:
   - Install dependencies
   - Run the build command
   - Deploy your site
3. Wait for deployment to complete (usually 2-5 minutes)

---

### Step 5: Configure Custom Domain (uploadanh.cloud)

After deployment:

1. Go to your project → **Settings** → **Custom domains**
2. Click **"Set up a custom domain"**
3. Enter: `uploadanh.cloud`
4. Cloudflare will provide DNS records to add:
   - Usually a **CNAME** record pointing to your Pages URL
   - Or **A** records with IP addresses

#### Add DNS Records

Go to your DNS provider (P.A Vietnam or Cloudflare):

**Option A: Root Domain (uploadanh.cloud)**
- Type: **CNAME**
- Name: `@` (or root)
- Value: (Cloudflare Pages will provide this, e.g., `photocloud.pages.dev`)

**Option B: Subdomain (www.uploadanh.cloud)**
- Type: **CNAME**
- Name: `www`
- Value: (Cloudflare Pages URL)

5. Wait for DNS propagation
6. Cloudflare will automatically provision SSL certificate

---

### Step 6: Verify API Proxy Configuration

Your `frontend/_redirects` file should contain:
```
/api/*  https://api.uploadanh.cloud/api/:splat  200
```

This file is automatically used by Cloudflare Pages to proxy API requests.

**Verify it's in your repository:**
- File location: `frontend/_redirects`
- Should be committed to Git

---

## 🧪 Testing After Deployment

1. **Visit your site**: `https://uploadanh.cloud`
2. **Test API calls**: 
   - Open browser DevTools → Network tab
   - Try signing up/login
   - Verify API requests go to `api.uploadanh.cloud`
3. **Check console**: Look for any errors

---

## 🔧 Troubleshooting

### Build Fails

**Error: "Cannot find module"**
- Check that all dependencies are in `package.json`
- Verify `node_modules` is not committed to Git

**Error: "Build command failed"**
- Check build logs in Cloudflare Pages
- Try building locally: `cd frontend && npm run build`

### API Calls Not Working

**CORS Errors:**
- Verify `CLIENT_URL` in Railway is set to `https://uploadanh.cloud`
- Check `FRONTEND_URL` matches your frontend domain

**404 on API calls:**
- Verify `_redirects` file is in `frontend/` directory
- Check the file is committed to Git
- Ensure redirect rule is correct

### Domain Not Working

**SSL Certificate Issues:**
- Wait 5-10 minutes for Cloudflare to provision SSL
- Check DNS records are correct
- Verify domain is active in Cloudflare Pages

---

## 📝 Environment Variables Reference

### Cloudflare Pages (Optional)
```
VITE_API_URL=https://api.uploadanh.cloud/api
```
*Note: Only needed if not using the `_redirects` proxy*

### Railway Backend (Required)
Make sure these are set:
```
CLIENT_URL=https://uploadanh.cloud
FRONTEND_URL=https://uploadanh.cloud
```

---

## 🎯 Final Checklist

Before going live:
- [ ] Frontend deployed on Cloudflare Pages
- [ ] Custom domain `uploadanh.cloud` configured
- [ ] SSL certificate active (automatic)
- [ ] `_redirects` file in repository
- [ ] Backend accessible at `https://api.uploadanh.cloud`
- [ ] Railway environment variables updated
- [ ] Test signup/login
- [ ] Test image upload
- [ ] No console errors

---

## 🚀 Quick Deploy Command Reference

If you need to rebuild:
```bash
# Local build test
cd frontend
npm install
npm run build

# Check output
ls -la dist/
```

---

## 📚 Additional Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages)
- [Cloudflare Pages Redirects](https://developers.cloudflare.com/pages/platform/redirects)
- [Vite Build Guide](https://vitejs.dev/guide/build.html)

---

**Ready to deploy?** Follow the steps above! 🎉

