# 🚀 Quick Deployment Checklist

Follow this checklist for the fastest deployment.

## ⚡ 5-Minute Setup (Free Tier)

### 1. Database (2 minutes)
- [ ] Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [ ] Create FREE M0 cluster
- [ ] Create database user (save password!)
- [ ] Add IP `0.0.0.0/0` to Network Access (temporarily)
- [ ] Copy connection string

### 2. Backend (2 minutes)
- [ ] Sign up at [Railway](https://railway.app) (or [Render](https://render.com))
- [ ] Connect GitHub repo
- [ ] Deploy from `backend` folder
- [ ] Add environment variables (see below)

### 3. Frontend (1 minute)
- [ ] Sign up at [Cloudflare Pages](https://pages.cloudflare.com) (or [Vercel](https://vercel.com))
- [ ] Connect GitHub repo
- [ ] Deploy from `frontend` folder
- [ ] Update `_redirects` or `vercel.json` with backend URL

---

## 📋 Environment Variables Checklist

### Backend (Railway/Render)

**Required:**
```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/photocloud
ACCESS_TOKEN_SECRET=<generate_with_openssl_rand_base64_32>
CLIENT_URL=https://your-frontend.vercel.app
FRONTEND_URL=https://your-frontend.vercel.app
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_r2_bucket_name
R2_PUBLIC_URL=your_r2_public_url
```

**Optional:**
```bash
RESEND_API_KEY=your_resend_key
EMAIL_FROM_NAME=PhotoCloud
EMAIL_FROM=noreply@yourdomain.com
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-backend.railway.app/api/auth/google/callback
ARCJET_KEY=your_arcjet_key
ARCJET_ENV=production
```

### Frontend (Cloudflare Pages/Vercel)

**Optional (if not using proxy):**
```bash
VITE_API_URL=https://your-backend.railway.app/api
```

---

## 🔧 Quick Fixes

### Generate Secrets:
```bash
# ACCESS_TOKEN_SECRET
openssl rand -base64 32

# Random password
openssl rand -base64 24
```

### Update Proxy Configuration:

**For Vercel** (`frontend/vercel.json`):
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://YOUR_BACKEND_URL/api/:path*"
    }
  ]
}
```

**For Cloudflare Pages** (`frontend/_redirects`):
```
/api/*  https://YOUR_BACKEND_URL/api/:splat  200
```

---

## ✅ Post-Deployment Checklist

- [ ] Test signup/login
- [ ] Test image upload
- [ ] Test image viewing
- [ ] Check CORS errors in browser console
- [ ] Verify API calls work
- [ ] Test on mobile device
- [ ] Update MongoDB network access (restrict IPs)

---

## 🆘 Common Issues

**CORS Error?**
- Check `CLIENT_URL` matches frontend domain exactly
- Check frontend is using correct backend URL

**Database Connection Failed?**
- Verify MongoDB connection string
- Check network access allows your backend IP
- Verify username/password are correct

**API 404?**
- Check proxy configuration
- Verify backend URL is correct
- Check backend is running

**Build Failed?**
- Check Node.js version (should be 18+)
- Verify all dependencies in package.json
- Check build logs for specific errors

---

## 💡 Pro Tips

1. **Start with free tiers** - upgrade only if needed
2. **Use same domain** - easier CORS and cookie handling
3. **Monitor costs** - set up billing alerts
4. **Test locally first** - use production env vars
5. **Backup database** - MongoDB Atlas has free backups

---

**Total Time**: ~5-10 minutes  
**Total Cost**: $0-5/month

