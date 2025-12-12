# Postman Quick Start Guide

A step-by-step guide to test your PhotoCloud backend API with Postman.

## Step 1: Install and Setup Postman

1. **Download Postman** (if not installed): https://www.postman.com/downloads/
2. **Open Postman** and create a new workspace

## Step 2: Create Environment Variables

1. Click **"Environments"** in the left sidebar (or press `Ctrl+E`)
2. Click **"+"** to create a new environment
3. Name it: `PhotoCloud Local`
4. Add these variables:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `baseUrl` | `http://localhost:3000` | `http://localhost:3000` |
| `accessToken` | (leave empty) | (will be set after login) |
| `csrfToken` | (leave empty) | (will be set automatically) |
| `userId` | (leave empty) | (will be set after login) |
| `imageId` | (leave empty) | (use any image ID from your DB) |

5. Click **"Save"**
6. **Select this environment** from the dropdown in the top-right corner

## Step 3: Start Your Backend

```bash
cd backend
npm run dev
```

Make sure the server is running on port 3000 (or your configured port).

## Step 4: Get CSRF Token

1. **Create a new request** in Postman
2. Set method to **GET**
3. Enter URL: `{{baseUrl}}/api/csrf-token`
4. Click **"Send"**
5. In the **Response Headers**, find `X-CSRF-Token`
6. Copy the token value
7. Go to your environment and set `csrfToken` = (the token you copied)

**OR** use this script to auto-save (see Step 6):

## Step 5: Sign Up or Sign In

### Option A: Sign Up (if you don't have an account)

1. Create new request: **POST** `{{baseUrl}}/api/auth/signup`
2. Go to **Headers** tab:
   - `Content-Type: application/json`
3. Go to **Body** tab → select **raw** → **JSON**:
```json
{
  "email": "test@example.com",
  "username": "testuser",
  "password": "Test123!@#",
  "displayName": "Test User"
}
```
4. Click **Send**
5. If successful, you'll get a response with `accessToken`

### Option B: Sign In (if you have an account)

1. Create new request: **POST** `{{baseUrl}}/api/auth/signin`
2. Go to **Headers** tab:
   - `Content-Type: application/json`
3. Go to **Body** tab → select **raw** → **JSON**:
```json
{
  "email": "test@example.com",
  "password": "Test123!@#"
}
```
4. Click **Send**
5. **Copy the `accessToken`** from the response
6. Go to your environment and set `accessToken` = (the token you copied)

## Step 6: Auto-Save Tokens (Optional but Recommended)

Create a **Collection** and add this to the **Pre-request Script**:

1. Click **"Collections"** → **"+"** → Name it "PhotoCloud API"
2. Click on the collection → **"..."** → **"Edit"**
3. Go to **"Pre-request Script"** tab
4. Paste this script:

```javascript
// Auto-fetch CSRF token if not set
if (!pm.environment.get("csrfToken")) {
    pm.sendRequest({
        url: pm.environment.get("baseUrl") + "/api/csrf-token",
        method: 'GET'
    }, function (err, res) {
        if (res && res.headers.get("X-CSRF-Token")) {
            pm.environment.set("csrfToken", res.headers.get("X-CSRF-Token"));
        }
    });
}
```

5. Go to **"Tests"** tab and add this to auto-save access token:

```javascript
// Auto-save access token from signin/signup responses
if (pm.response.code === 200 || pm.response.code === 201) {
    const jsonData = pm.response.json();
    if (jsonData.accessToken) {
        pm.environment.set("accessToken", jsonData.accessToken);
        console.log("✅ Access token saved!");
    }
    if (jsonData.user && jsonData.user._id) {
        pm.environment.set("userId", jsonData.user._id);
        console.log("✅ User ID saved!");
    }
}
```

## Step 7: Test Your First Endpoint

### Example: Get Current User (Me)

1. Create new request: **GET** `{{baseUrl}}/api/users/me`
2. Go to **Headers** tab:
   - `Authorization: Bearer {{accessToken}}`
3. Click **Send**
4. You should see your user data!

### Example: Get All Images

1. Create new request: **GET** `{{baseUrl}}/api/images?page=1&limit=10`
2. No headers needed (public endpoint)
3. Click **Send**
4. You should see a list of images

### Example: Create a Favorite (State-Changing Request)

1. Create new request: **POST** `{{baseUrl}}/api/favorites/:imageId`
   - Replace `:imageId` with an actual image ID (e.g., `507f1f77bcf86cd799439011`)
2. Go to **Headers** tab:
   - `Authorization: Bearer {{accessToken}}`
   - `X-XSRF-TOKEN: {{csrfToken}}`
   - `Content-Type: application/json`
3. Click **Send**
4. If successful, the image is now favorited!

## Step 8: Common Request Patterns

### Pattern 1: GET Request (No Auth)
```
Method: GET
URL: {{baseUrl}}/api/images
Headers: (none needed)
```

### Pattern 2: GET Request (With Auth)
```
Method: GET
URL: {{baseUrl}}/api/users/me
Headers:
  Authorization: Bearer {{accessToken}}
```

### Pattern 3: POST/PUT/PATCH/DELETE (State-Changing)
```
Method: POST
URL: {{baseUrl}}/api/favorites/:imageId
Headers:
  Authorization: Bearer {{accessToken}}
  X-XSRF-TOKEN: {{csrfToken}}
  Content-Type: application/json
Body (raw JSON):
{
  "key": "value"
}
```

### Pattern 4: File Upload
```
Method: POST
URL: {{baseUrl}}/api/images/upload
Headers:
  Authorization: Bearer {{accessToken}}
  X-XSRF-TOKEN: {{csrfToken}}
Body (form-data):
  image: [Select File]
  imageTitle: My Image
  imageCategory: categoryId
```

## Step 9: Testing Checklist

Test these endpoints in order:

### ✅ Basic Tests (No Auth)
- [ ] `GET /api/health` - Should return `{"status": "ok"}`
- [ ] `GET /api/settings` - Should return settings
- [ ] `GET /api/images?page=1&limit=5` - Should return images

### ✅ Authentication
- [ ] `POST /api/auth/signup` - Create account
- [ ] `POST /api/auth/signin` - Login (save token!)
- [ ] `GET /api/users/me` - Get your profile (requires auth)

### ✅ Images
- [ ] `GET /api/images` - List images
- [ ] `GET /api/images/:imageId` - Get single image
- [ ] `PATCH /api/images/:imageId/view` - Increment view
- [ ] `POST /api/favorites/:imageId` - Favorite an image

### ✅ User Actions
- [ ] `GET /api/users/me` - Your profile
- [ ] `PUT /api/users/change-info` - Update profile
- [ ] `GET /api/favorites` - Your favorites
- [ ] `GET /api/collections` - Your collections

### ✅ Admin (if you're admin)
- [ ] `GET /api/admin/dashboard/stats` - Dashboard
- [ ] `GET /api/admin/users` - List users
- [ ] `GET /api/admin/images` - List all images

## Step 10: Troubleshooting

### ❌ Error: "CSRF token mismatch"
**Fix:**
1. Get a fresh CSRF token: `GET /api/csrf-token`
2. Update `{{csrfToken}}` in your environment
3. Make sure `X-XSRF-TOKEN` header is included

### ❌ Error: "Unauthorized" or 401
**Fix:**
1. Sign in again: `POST /api/auth/signin`
2. Copy the new `accessToken`
3. Update `{{accessToken}}` in your environment
4. Make sure `Authorization: Bearer {{accessToken}}` header is included

### ❌ Error: "CORS policy"
**Fix:**
1. Make sure backend is running
2. Check `CLIENT_URL` in backend `.env` includes your origin
3. For local testing, `localhost` should work automatically

### ❌ Error: "Rate limit exceeded"
**Fix:**
1. Wait a few seconds
2. Check rate limit headers in response
3. Use different test accounts if needed

## Step 11: Organize Your Requests

Create folders in your Postman collection:

```
PhotoCloud API/
├── 01. Authentication/
│   ├── Sign Up
│   ├── Sign In
│   ├── Sign Out
│   └── Get CSRF Token
├── 02. Public Endpoints/
│   ├── Health Check
│   ├── Get Images
│   └── Get Categories
├── 03. User Endpoints/
│   ├── Get Me
│   ├── Update Profile
│   └── Get Favorites
├── 04. Image Endpoints/
│   ├── Upload Image
│   ├── Update Image
│   └── Delete Image
└── 05. Admin Endpoints/
    ├── Dashboard Stats
    ├── Get Users
    └── Get Images
```

## Step 12: Use Variables Everywhere

Instead of hardcoding values, use variables:

✅ **Good:**
```
{{baseUrl}}/api/images/{{imageId}}
```

❌ **Bad:**
```
http://localhost:3000/api/images/507f1f77bcf86cd799439011
```

## Quick Reference: Most Used Endpoints

### Authentication
```
POST {{baseUrl}}/api/auth/signin
Body: {"email": "...", "password": "..."}
```

### Get Your Profile
```
GET {{baseUrl}}/api/users/me
Header: Authorization: Bearer {{accessToken}}
```

### Get Images
```
GET {{baseUrl}}/api/images?page=1&limit=20
```

### Favorite an Image
```
POST {{baseUrl}}/api/favorites/{{imageId}}
Headers:
  Authorization: Bearer {{accessToken}}
  X-XSRF-TOKEN: {{csrfToken}}
```

### Create Collection
```
POST {{baseUrl}}/api/collections
Headers:
  Authorization: Bearer {{accessToken}}
  X-XSRF-TOKEN: {{csrfToken}}
Body: {"name": "My Collection", "isPublic": true}
```

## Pro Tips

1. **Save Responses**: Right-click response → "Save Response" → "Save as Example"
2. **Use Collection Runner**: Test multiple requests in sequence
3. **Add Tests**: Write assertions in "Tests" tab to verify responses
4. **Use Environments**: Create separate environments for dev/staging/prod
5. **Import/Export**: Share your collection with team members

## Need More Details?

See the full guide: `POSTMAN_TESTING_GUIDE.md` for complete endpoint documentation.
