# PhotoCloud Deployment Guide - Cheapest Options

This guide covers the **cheapest deployment options** for your PhotoCloud application.

## 🎯 Recommended Stack (Total: **$0-5/month**)

### Option 1: Ultra-Cheap (Free Tier)
- **Frontend**: Cloudflare Pages (FREE)
- **Backend**: Railway (FREE tier with $5 credit/month)
- **Database**: MongoDB Atlas (FREE tier - 512MB)
- **Storage**: Cloudflare R2 (Already configured, very cheap)

### Option 2: Slightly More Reliable (~$5-10/month)
- **Frontend**: Vercel (FREE tier)
- **Backend**: Render (FREE tier) or Railway ($5/month)
- **Database**: MongoDB Atlas (FREE tier)
- **Storage**: Cloudflare R2

---

## 📋 Prerequisites

1. **GitHub Account** (for connecting to deployment platforms)
2. **MongoDB Atlas Account** (free tier)
3. **Cloudflare Account** (for R2 storage - already configured)
4. **Domain Name** (optional, but recommended)

---

## 🚀 Step-by-Step Deployment

### Part 1: Database Setup (MongoDB Atlas)

1. **Create MongoDB Atlas Account**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up for free
   - Create a new cluster (select FREE tier M0)
   - Choose a cloud provider and region closest to your users

2. **Configure Database Access**
   - Go to "Database Access" → "Add New Database User"
   - Create a user with username/password
   - Save credentials securely

3. **Configure Network Access**
   - Go to "Network Access" → "Add IP Address"
   - For initial setup, add `0.0.0.0/0` (allow from anywhere)
   - **Later**: Restrict to your backend IPs for security

4. **Get Connection String**
   - Go to "Database" → "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Example: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/photocloud?retryWrites=true&w=majority`

---

### Part 2: Backend Deployment

#### Option A: Railway (Recommended - Free $5 credit/month)

1. **Sign up at Railway**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository
   - Select the `backend` folder (or root if monorepo)

3. **Configure Build Settings**
   - Root Directory: `backend`
   - Build Command: (leave empty, Railway auto-detects)
   - Start Command: `npm start`

4. **Set Environment Variables**
   Go to your project → Variables tab, add:
   ```
   NODE_ENV=production
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   ACCESS_TOKEN_SECRET=generate_a_random_secret_key_here
   CLIENT_URL=https://your-frontend-domain.com
   FRONTEND_URL=https://your-frontend-domain.com
   
   # R2 Storage (already configured)
   R2_ACCOUNT_ID=your_r2_account_id
   R2_ACCESS_KEY_ID=your_r2_access_key
   R2_SECRET_ACCESS_KEY=your_r2_secret_key
   R2_BUCKET_NAME=your_r2_bucket_name
   R2_PUBLIC_URL=your_r2_public_url
   
   # Optional: Email (Resend)
   RESEND_API_KEY=your_resend_api_key
   EMAIL_FROM_NAME=PhotoCloud
   EMAIL_FROM=noreply@yourdomain.com
   
   # Optional: Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=https://your-backend-url.com/api/auth/google/callback
   
   # Optional: Arcjet (security)
   ARCJET_KEY=your_arcjet_key
   ARCJET_ENV=production
   ```

5. **Deploy**
   - Railway will automatically deploy
   - Get your backend URL (e.g., `https://your-app.up.railway.app`)

#### Option B: Render (Free Tier - Sleeps after inactivity)

1. **Sign up at Render**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the `backend` folder

3. **Configure Settings**
   - **Name**: `photocloud-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free (sleeps after 15 min inactivity)

4. **Set Environment Variables** (same as Railway above)

5. **Deploy**
   - Render will deploy automatically
   - Get your backend URL (e.g., `https://photocloud-backend.onrender.com`)

---

### Part 3: Frontend Deployment

#### Option A: Cloudflare Pages (Recommended - FREE, Fast CDN)

1. **Sign up at Cloudflare Pages**
   - Go to https://pages.cloudflare.com
   - Sign in with Cloudflare account

2. **Create New Project**
   - Click "Create a project"
   - Connect your GitHub repository
   - Select repository and branch

3. **Configure Build Settings**
   - **Framework preset**: Vite
   - **Build command**: `cd frontend && npm run build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `/` (or leave empty)

4. **Set Environment Variables**
   - Go to Settings → Environment Variables
   - Add:
   ```
   VITE_API_URL=https://your-backend-url.com/api
   ```
   (Note: If using same domain, you may not need this)

5. **Custom Domain (Optional)**
   - Add your custom domain in Settings → Custom domains
   - Cloudflare will provide DNS records

#### Option B: Vercel (FREE, Great DX)

1. **Sign up at Vercel**
   - Go to https://vercel.com
   - Sign up with GitHub

2. **Import Project**
   - Click "Add New" → "Project"
   - Import your GitHub repository

3. **Configure Project**
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Set Environment Variables**
   - Go to Settings → Environment Variables
   - Add:
   ```
   VITE_API_URL=https://your-backend-url.com/api
   ```

5. **Deploy**
   - Click "Deploy"
   - Get your frontend URL (e.g., `https://your-app.vercel.app`)

---

### Part 4: Update Frontend API Configuration

Since your frontend uses `/api` as base URL in production, you have two options:

#### Option 1: Proxy API through Frontend (Recommended)
Configure your frontend host to proxy `/api` requests to your backend.

**For Vercel**: Create `vercel.json` in `frontend/`:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend-url.com/api/:path*"
    }
  ]
}
```

**For Cloudflare Pages**: Use Cloudflare Workers or configure redirects in `_redirects` file:
```
/api/*  https://your-backend-url.com/api/:splat  200
```

#### Option 2: Update Frontend to Use Full Backend URL
Modify `frontend/src/lib/axios.ts` to use environment variable:
```typescript
baseURL: import.meta.env.VITE_API_URL || '/api'
```

---

### Part 5: Update CORS and Environment Variables

1. **Update Backend CORS**
   - In your backend environment variables, set:
   ```
   CLIENT_URL=https://your-frontend-domain.com
   FRONTEND_URL=https://your-frontend-domain.com
   ```

2. **Update MongoDB Network Access**
   - Add your backend deployment IPs to MongoDB Atlas Network Access
   - Or use `0.0.0.0/0` for development (not recommended for production)

---

## 🔐 Security Checklist

- [ ] Use strong `ACCESS_TOKEN_SECRET` (generate with: `openssl rand -base64 32`)
- [ ] Restrict MongoDB network access to backend IPs
- [ ] Use HTTPS everywhere
- [ ] Set secure cookie flags in production
- [ ] Enable CORS only for your frontend domain
- [ ] Keep environment variables secret
- [ ] Use strong database passwords

---

## 💰 Cost Breakdown

### Free Tier Option:
- **Frontend (Cloudflare Pages)**: $0/month
- **Backend (Railway free tier)**: $0/month (first $5 credit)
- **Database (MongoDB Atlas)**: $0/month (512MB free)
- **Storage (Cloudflare R2)**: ~$0.015/GB storage + $0.36/GB egress
- **Total**: ~$0-2/month for small apps

### Paid Option (if you exceed free tiers):
- **Backend (Railway)**: $5/month (after free credit)
- **Database (MongoDB Atlas)**: $9/month (M2 cluster)
- **Total**: ~$14-20/month

---

## 🚨 Troubleshooting

### Backend Issues:
- **Port**: Ensure backend uses `process.env.PORT` (Railway/Render set this automatically)
- **Database Connection**: Check MongoDB connection string and network access
- **CORS Errors**: Verify `CLIENT_URL` matches your frontend domain exactly

### Frontend Issues:
- **API Calls Failing**: Check if API proxy is configured correctly
- **Build Errors**: Ensure all dependencies are in `package.json`
- **Environment Variables**: Make sure `VITE_` prefix is used for Vite env vars

### Database Issues:
- **Connection Timeout**: Add deployment IPs to MongoDB network access
- **Authentication Failed**: Verify username/password in connection string

---

## 📝 Quick Deploy Commands

### Generate Secrets:
```bash
# Generate ACCESS_TOKEN_SECRET
openssl rand -base64 32

# Generate random password
openssl rand -base64 24
```

### Test Locally Before Deploying:
```bash
# Backend
cd backend
npm install
npm start

# Frontend
cd frontend
npm install
npm run build
npm run preview
```

---

## 🎉 Next Steps After Deployment

1. **Test all features** (signup, login, upload, etc.)
2. **Set up monitoring** (optional: Sentry, LogRocket)
3. **Configure custom domain** (optional)
4. **Set up backups** for MongoDB
5. **Monitor costs** and usage

---

## 📚 Additional Resources

- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages)
- [Vercel Docs](https://vercel.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com)

---

**Need help?** Check the deployment platform's documentation or support channels.

