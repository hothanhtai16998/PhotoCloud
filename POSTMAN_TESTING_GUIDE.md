# Postman Testing Guide for PhotoCloud Backend API

This guide will help you test all backend endpoints using Postman.

## Table of Contents
1. [Setup](#setup)
2. [Authentication Flow](#authentication-flow)
3. [CSRF Token Handling](#csrf-token-handling)
4. [API Endpoints](#api-endpoints)
5. [Postman Collection Setup](#postman-collection-setup)

---

## Setup

### 1. Base URL
- **Development**: `http://localhost:3000`
- **Production**: Your production URL (e.g., `https://yourdomain.com`)

### 2. Environment Variables in Postman
Create a Postman environment with these variables:
- `baseUrl`: `http://localhost:3000`
- `accessToken`: (will be set after login)
- `csrfToken`: (will be set after first request)
- `userId`: (your user ID for testing)
- `imageId`: (an image ID for testing)
- `collectionId`: (a collection ID for testing)

---

## Authentication Flow

### Step 1: Sign Up (if needed)
```
POST {{baseUrl}}/api/auth/signup
Content-Type: application/json

{
  "email": "test@example.com",
  "username": "testuser",
  "password": "Test123!@#",
  "displayName": "Test User"
}
```

### Step 2: Sign In
```
POST {{baseUrl}}/api/auth/signin
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test123!@#"
}
```

**Response will include:**
- `accessToken` - Save this to `accessToken` variable
- Cookie: `accessToken` - Automatically saved by Postman

### Step 3: Get CSRF Token
```
GET {{baseUrl}}/api/csrf-token
```

**Response headers include:**
- `X-CSRF-Token` - Save this to `csrfToken` variable
- Cookie: `XSRF-TOKEN` - Automatically saved by Postman

---

## CSRF Token Handling

### Important Notes:
1. **CSRF tokens are required** for all state-changing requests (POST, PUT, DELETE, PATCH)
2. **CSRF tokens are NOT required** for GET requests
3. The token is sent in two places:
   - **Header**: `X-XSRF-TOKEN: {{csrfToken}}`
   - **Cookie**: `XSRF-TOKEN` (automatically sent by Postman)

### Postman Pre-request Script (for automatic CSRF token)
Add this to your Postman collection's pre-request script:

```javascript
// Get CSRF token from cookie or fetch it
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

### Postman Request Headers (for state-changing requests)
```
X-XSRF-TOKEN: {{csrfToken}}
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

---

## API Endpoints

### Health & System

#### Health Check
```
GET {{baseUrl}}/api/health
```
No authentication required.

#### Get Public Settings
```
GET {{baseUrl}}/api/settings
```
No authentication required.

---

### Authentication Endpoints

#### Check Email Availability
```
GET {{baseUrl}}/api/auth/check-email?email=test@example.com
```

#### Check Username Availability
```
GET {{baseUrl}}/api/auth/check-username?username=testuser
```

#### Sign Up
```
POST {{baseUrl}}/api/auth/signup
Content-Type: application/json

{
  "email": "test@example.com",
  "username": "testuser",
  "password": "Test123!@#",
  "displayName": "Test User"
}
```

#### Sign In
```
POST {{baseUrl}}/api/auth/signin
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test123!@#"
}
```

#### Sign Out
```
POST {{baseUrl}}/api/auth/signout
Authorization: Bearer {{accessToken}}
```

#### Refresh Token
```
POST {{baseUrl}}/api/auth/refresh
```

#### Get Active Sessions
```
GET {{baseUrl}}/api/auth/sessions
Authorization: Bearer {{accessToken}}
```

#### Sign Out All Devices
```
POST {{baseUrl}}/api/auth/sessions/signout-all
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

#### Sign Out Specific Session
```
DELETE {{baseUrl}}/api/auth/sessions/:sessionId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

#### Google OAuth Test
```
GET {{baseUrl}}/api/auth/google/test
```

---

### User Endpoints

#### Get Current User (Me)
```
GET {{baseUrl}}/api/users/me
Authorization: Bearer {{accessToken}}
```

#### Search Users
```
GET {{baseUrl}}/api/users/search?q=test
Authorization: Bearer {{accessToken}}
```

#### Change Password
```
PUT {{baseUrl}}/api/users/change-password
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

#### Change User Info
```
PUT {{baseUrl}}/api/users/change-info
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: multipart/form-data

displayName: Test User
bio: My bio
location: City, Country
```

#### Get User Analytics
```
GET {{baseUrl}}/api/users/analytics
Authorization: Bearer {{accessToken}}
```

#### Get User by Username (Public)
```
GET {{baseUrl}}/api/users/username/:username
```

#### Get User by ID (Public)
```
GET {{baseUrl}}/api/users/:userId
```

#### Get User Stats (Public)
```
GET {{baseUrl}}/api/users/:userId/stats
```

#### Track Profile View
```
POST {{baseUrl}}/api/users/:userId/view
Authorization: Bearer {{accessToken}}
```

#### Get Pinned Images
```
GET {{baseUrl}}/api/users/pinned-images
Authorization: Bearer {{accessToken}}
```

#### Get User's Pinned Images (Public)
```
GET {{baseUrl}}/api/users/:userId/pinned-images
```

#### Pin Image
```
POST {{baseUrl}}/api/users/pinned-images
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "imageId": "{{imageId}}"
}
```

#### Unpin Image
```
DELETE {{baseUrl}}/api/users/pinned-images/:imageId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

#### Reorder Pinned Images
```
PATCH {{baseUrl}}/api/users/pinned-images/reorder
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "imageIds": ["id1", "id2", "id3"]
}
```

---

### Image Endpoints

#### Get All Images (Public)
```
GET {{baseUrl}}/api/images?page=1&limit=20&category=all&search=test
```

#### Get Locations
```
GET {{baseUrl}}/api/images/locations
```

#### Increment View Count
```
PATCH {{baseUrl}}/api/images/:imageId/view
Authorization: Bearer {{accessToken}} (optional)
```

#### Increment Download Count
```
PATCH {{baseUrl}}/api/images/:imageId/download
Authorization: Bearer {{accessToken}} (optional)
```

#### Proxy Image (CORS)
```
GET {{baseUrl}}/api/images/:imageId/proxy
```

#### Download Image
```
GET {{baseUrl}}/api/images/:imageId/download
Authorization: Bearer {{accessToken}} (optional)
```

#### Pre-upload Image (Upload to R2)
```
POST {{baseUrl}}/api/images/pre-upload
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "fileName": "test.jpg",
  "fileType": "image/jpeg",
  "fileSize": 1024000
}
```

#### Delete Pre-uploaded File
```
DELETE {{baseUrl}}/api/images/pre-upload
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "uploadKey": "photo-app-raw/..."
}
```

#### Finalize Image Upload
```
POST {{baseUrl}}/api/images/finalize
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "uploadKey": "photo-app-raw/...",
  "imageTitle": "My Image",
  "imageCategory": "categoryId",
  "location": "City, Country",
  "coordinates": {"latitude": 10.0, "longitude": 106.0},
  "cameraModel": "Canon EOS",
  "tags": ["tag1", "tag2"]
}
```

#### Legacy Upload (Single Image)
```
POST {{baseUrl}}/api/images/upload
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: multipart/form-data

image: (file)
imageTitle: My Image
imageCategory: categoryId
location: City, Country
coordinates: {"latitude": 10.0, "longitude": 106.0}
cameraModel: Canon EOS
```

#### Update Image
```
PATCH {{baseUrl}}/api/images/:imageId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "imageTitle": "Updated Title",
  "location": "New Location"
}
```

#### Replace Image
```
PATCH {{baseUrl}}/api/images/:imageId/replace
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: multipart/form-data

image: (file)
```

#### Batch Replace Images
```
PATCH {{baseUrl}}/api/images/batch/replace
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: multipart/form-data

images: (multiple files)
imageIds: ["id1", "id2"]
```

#### Get Images by User ID
```
GET {{baseUrl}}/api/images/user/:userId?page=1&limit=20
Authorization: Bearer {{accessToken}} (optional)
```

#### Bulk Upload Notification
```
POST {{baseUrl}}/api/images/bulk-upload-notification
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "successCount": 10,
  "totalCount": 12,
  "failedCount": 2
}
```

---

### Category Endpoints

#### Get All Categories (Public)
```
GET {{baseUrl}}/api/categories
```

#### Get All Categories (Admin)
```
GET {{baseUrl}}/api/categories/admin
Authorization: Bearer {{accessToken}}
```

#### Create Category (Admin)
```
POST {{baseUrl}}/api/categories/admin
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "name": "New Category",
  "description": "Category description",
  "slug": "new-category"
}
```

#### Update Category (Admin)
```
PUT {{baseUrl}}/api/categories/admin/:categoryId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "name": "Updated Category",
  "description": "Updated description"
}
```

#### Delete Category (Admin)
```
DELETE {{baseUrl}}/api/categories/admin/:categoryId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

---

### Favorite Endpoints

#### Get Favorites
```
GET {{baseUrl}}/api/favorites?page=1&limit=20
Authorization: Bearer {{accessToken}}
```

#### Check Favorites (Batch)
```
POST {{baseUrl}}/api/favorites/check
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "imageIds": ["id1", "id2", "id3"]
}
```

#### Toggle Favorite
```
POST {{baseUrl}}/api/favorites/:imageId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

---

### Collection Endpoints

#### Get User Collections
```
GET {{baseUrl}}/api/collections
Authorization: Bearer {{accessToken}}
```

#### Get Collections Containing Image
```
GET {{baseUrl}}/api/collections/containing/:imageId
Authorization: Bearer {{accessToken}}
```

#### Track Collection Share
```
POST {{baseUrl}}/api/collections/:collectionId/share
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "platform": "facebook"
}
```

#### Export Collection
```
GET {{baseUrl}}/api/collections/:collectionId/export
Authorization: Bearer {{accessToken}}
```

#### Get Collection by ID
```
GET {{baseUrl}}/api/collections/:collectionId
Authorization: Bearer {{accessToken}}
```

#### Create Collection
```
POST {{baseUrl}}/api/collections
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "name": "My Collection",
  "description": "Collection description",
  "isPublic": true,
  "tags": ["tag1", "tag2"]
}
```

#### Update Collection
```
PATCH {{baseUrl}}/api/collections/:collectionId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "name": "Updated Collection",
  "description": "Updated description"
}
```

#### Delete Collection
```
DELETE {{baseUrl}}/api/collections/:collectionId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

#### Add Image to Collection
```
POST {{baseUrl}}/api/collections/:collectionId/images
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "imageId": "{{imageId}}"
}
```

#### Remove Image from Collection
```
DELETE {{baseUrl}}/api/collections/:collectionId/images/:imageId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

#### Reorder Collection Images
```
PATCH {{baseUrl}}/api/collections/:collectionId/images/reorder
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "imageIds": ["id1", "id2", "id3"]
}
```

#### Add Collaborator
```
POST {{baseUrl}}/api/collections/:collectionId/collaborators
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "userId": "{{userId}}",
  "permission": "edit"
}
```

#### Remove Collaborator
```
DELETE {{baseUrl}}/api/collections/:collectionId/collaborators/:collaboratorId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

#### Update Collaborator Permission
```
PATCH {{baseUrl}}/api/collections/:collectionId/collaborators/:collaboratorId/permission
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "permission": "view"
}
```

---

### Collection Favorite Endpoints

#### Toggle Collection Favorite
```
POST {{baseUrl}}/api/collection-favorites/:collectionId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

---

### Follow Endpoints

#### Get Following (Current User)
```
GET {{baseUrl}}/api/follow/following
Authorization: Bearer {{accessToken}}
```

#### Get Followers (Current User)
```
GET {{baseUrl}}/api/follow/followers
Authorization: Bearer {{accessToken}}
```

#### Get User Following (Public)
```
GET {{baseUrl}}/api/follow/:userId/following
```

#### Get User Followers (Public)
```
GET {{baseUrl}}/api/follow/:userId/followers
```

#### Follow User
```
POST {{baseUrl}}/api/follow/:userId
Authorization: Bearer {{accessToken}}
```

#### Unfollow User
```
DELETE {{baseUrl}}/api/follow/:userId
Authorization: Bearer {{accessToken}}
```

#### Get Follow Stats (Public)
```
GET {{baseUrl}}/api/follow/:userId/stats
```

#### Get Follow Status
```
GET {{baseUrl}}/api/follow/:userId/status
Authorization: Bearer {{accessToken}}
```

---

### Search Endpoints

#### Get Search Suggestions
```
GET {{baseUrl}}/api/search/suggestions?q=test
```

#### Get Popular Searches
```
GET {{baseUrl}}/api/search/popular
```

---

### Notification Endpoints

#### Get Unread Count
```
GET {{baseUrl}}/api/notifications/unread-count
Authorization: Bearer {{accessToken}}
```

#### Get Notifications
```
GET {{baseUrl}}/api/notifications?page=1&limit=20
Authorization: Bearer {{accessToken}}
```

#### Mark Notification as Read
```
PATCH {{baseUrl}}/api/notifications/:notificationId/read
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

#### Mark All Notifications as Read
```
PATCH {{baseUrl}}/api/notifications/read-all
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

#### Delete Notification
```
DELETE {{baseUrl}}/api/notifications/:notificationId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

---

### Collection Favorite Endpoints

#### Get Favorite Collections
```
GET {{baseUrl}}/api/collection-favorites
Authorization: Bearer {{accessToken}}
```

#### Check Collection Favorites (Batch)
```
POST {{baseUrl}}/api/collection-favorites/check
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "collectionIds": ["id1", "id2", "id3"]
}
```

#### Toggle Collection Favorite
```
POST {{baseUrl}}/api/collection-favorites/:collectionId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

---

### Collection Template Endpoints

#### Get All Templates
```
GET {{baseUrl}}/api/collection-templates
Authorization: Bearer {{accessToken}}
```

#### Get Template by ID
```
GET {{baseUrl}}/api/collection-templates/:templateId
Authorization: Bearer {{accessToken}}
```

#### Create Template
```
POST {{baseUrl}}/api/collection-templates
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "name": "My Template",
  "description": "Template description",
  "structure": {...}
}
```

#### Create Collection from Template
```
POST {{baseUrl}}/api/collection-templates/:templateId/collections
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "name": "Collection from Template"
}
```

#### Update Template
```
PATCH {{baseUrl}}/api/collection-templates/:templateId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "name": "Updated Template"
}
```

#### Delete Template
```
DELETE {{baseUrl}}/api/collection-templates/:templateId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

#### Save Collection as Template
```
POST {{baseUrl}}/api/collection-templates/from-collection/:collectionId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "name": "Template Name"
}
```

---

### Collection Version Endpoints

#### Get Collection Versions
```
GET {{baseUrl}}/api/collection-versions/collection/:collectionId
Authorization: Bearer {{accessToken}}
```

#### Get Version by Number
```
GET {{baseUrl}}/api/collection-versions/collection/:collectionId/version/:versionNumber
Authorization: Bearer {{accessToken}}
```

#### Restore Collection Version
```
POST {{baseUrl}}/api/collection-versions/collection/:collectionId/version/:versionNumber/restore
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

---

### Report Endpoints

#### Create Report
```
POST {{baseUrl}}/api/reports
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "type": "image",
  "targetId": "{{imageId}}",
  "reason": "Inappropriate content",
  "description": "Description of the issue"
}
```

#### Get User Reports
```
GET {{baseUrl}}/api/reports
Authorization: Bearer {{accessToken}}
```

#### Get All Reports (Admin)
```
GET {{baseUrl}}/api/reports/admin?page=1&limit=20&status=pending
Authorization: Bearer {{accessToken}}
```

#### Update Report Status (Admin)
```
PATCH {{baseUrl}}/api/reports/admin/:reportId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "status": "resolved",
  "notes": "Issue resolved"
}
```

---

### Admin Endpoints

**Note**: All admin endpoints require authentication and admin permissions.

#### Dashboard Stats
```
GET {{baseUrl}}/api/admin/dashboard/stats
Authorization: Bearer {{accessToken}}
```

#### System Metrics
```
GET {{baseUrl}}/api/admin/dashboard/metrics
Authorization: Bearer {{accessToken}}
```

#### Analytics
```
GET {{baseUrl}}/api/admin/analytics?days=30&type=views
Authorization: Bearer {{accessToken}}
```

#### Realtime Analytics
```
GET {{baseUrl}}/api/admin/analytics/realtime
Authorization: Bearer {{accessToken}}
```

#### Get All Users
```
GET {{baseUrl}}/api/admin/users?page=1&limit=20&search=test
Authorization: Bearer {{accessToken}}
```

#### Get User by ID
```
GET {{baseUrl}}/api/admin/users/:userId
Authorization: Bearer {{accessToken}}
```

#### Update User
```
PUT {{baseUrl}}/api/admin/users/:userId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "displayName": "Updated Name",
  "bio": "Updated bio"
}
```

#### Delete User
```
DELETE {{baseUrl}}/api/admin/users/:userId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

#### Ban User
```
POST {{baseUrl}}/api/admin/users/:userId/ban
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

#### Unban User
```
POST {{baseUrl}}/api/admin/users/:userId/unban
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

#### Get All Images (Admin)
```
GET {{baseUrl}}/api/admin/images?page=1&limit=20&status=pending
Authorization: Bearer {{accessToken}}
```

#### Update Image (Admin)
```
PUT {{baseUrl}}/api/admin/images/:imageId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "imageTitle": "Updated Title"
}
```

#### Delete Image (Admin)
```
DELETE {{baseUrl}}/api/admin/images/:imageId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

#### Moderate Image
```
POST {{baseUrl}}/api/admin/images/:imageId/moderate
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "action": "approve",
  "notes": "Looks good"
}
```

#### Get All Admin Roles
```
GET {{baseUrl}}/api/admin/roles
Authorization: Bearer {{accessToken}}
```

#### Get Admin Role
```
GET {{baseUrl}}/api/admin/roles/:userId
Authorization: Bearer {{accessToken}}
```

#### Create Admin Role (Super Admin Only)
```
POST {{baseUrl}}/api/admin/roles
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "userId": "{{userId}}",
  "role": "admin",
  "permissions": {
    "viewUsers": true,
    "editUsers": true
  }
}
```

#### Update Admin Role (Super Admin Only)
```
PUT {{baseUrl}}/api/admin/roles/:userId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "permissions": {
    "viewUsers": true,
    "editUsers": false
  }
}
```

#### Delete Admin Role (Super Admin Only)
```
DELETE {{baseUrl}}/api/admin/roles/:userId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

#### Get All Collections (Admin)
```
GET {{baseUrl}}/api/admin/collections?page=1&limit=20
Authorization: Bearer {{accessToken}}
```

#### Update Collection (Admin)
```
PUT {{baseUrl}}/api/admin/collections/:collectionId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "name": "Updated Collection"
}
```

#### Delete Collection (Admin)
```
DELETE {{baseUrl}}/api/admin/collections/:collectionId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

#### Export Data
```
GET {{baseUrl}}/api/admin/export?type=users&format=json
Authorization: Bearer {{accessToken}}
```

#### Get All Favorites (Admin)
```
GET {{baseUrl}}/api/admin/favorites?page=1&limit=20
Authorization: Bearer {{accessToken}}
```

#### Delete Favorite (Admin)
```
DELETE {{baseUrl}}/api/admin/favorites/:userId/:imageId
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

#### Get Pending Content
```
GET {{baseUrl}}/api/admin/moderation/pending?type=images&page=1
Authorization: Bearer {{accessToken}}
```

#### Approve Content
```
POST {{baseUrl}}/api/admin/moderation/:contentId/approve
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
```

#### Reject Content
```
POST {{baseUrl}}/api/admin/moderation/:contentId/reject
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "reason": "Violates guidelines"
}
```

#### Get System Logs
```
GET {{baseUrl}}/api/admin/logs?page=1&limit=50&level=error
Authorization: Bearer {{accessToken}}
```

#### Get Settings
```
GET {{baseUrl}}/api/admin/settings
Authorization: Bearer {{accessToken}}
```

#### Update Settings
```
PUT {{baseUrl}}/api/admin/settings
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "siteName": "My Photo App",
  "siteDescription": "Description"
}
```

#### Get Cache Stats (Super Admin Only)
```
GET {{baseUrl}}/api/admin/cache/stats
Authorization: Bearer {{accessToken}}
```

#### Create System Announcement
```
POST {{baseUrl}}/api/admin/announcements
Authorization: Bearer {{accessToken}}
X-XSRF-TOKEN: {{csrfToken}}
Content-Type: application/json

{
  "title": "Maintenance Notice",
  "message": "Scheduled maintenance on...",
  "type": "info"
}
```

#### Test Utilities (Super Admin Only - CSRF Disabled)
```
GET {{baseUrl}}/api/admin/test-utils/list-ids
Authorization: Bearer {{accessToken}}

POST {{baseUrl}}/api/admin/test-utils/reset-all-views-downloads
Authorization: Bearer {{accessToken}}

POST {{baseUrl}}/api/admin/test-utils/add-test-data
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "imageId": "{{imageId}}",
  "views": 100,
  "downloads": 50
}
```

---

## Postman Collection Setup

### 1. Create a Collection
1. Create a new collection named "PhotoCloud API"
2. Add environment variables (see Setup section)

### 2. Collection Pre-request Script
Add this script to automatically handle CSRF tokens:

```javascript
// Auto-fetch CSRF token if not set
if (!pm.environment.get("csrfToken") || pm.request.method !== "GET") {
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

### 3. Collection Variables
Set these at the collection level:
- `baseUrl`: `http://localhost:3000`

### 4. Request Templates

#### For GET Requests:
- Headers: `Authorization: Bearer {{accessToken}}` (if authenticated)

#### For POST/PUT/PATCH/DELETE Requests:
- Headers:
  - `Authorization: Bearer {{accessToken}}`
  - `X-XSRF-TOKEN: {{csrfToken}}`
  - `Content-Type: application/json`

#### For File Uploads:
- Headers:
  - `Authorization: Bearer {{accessToken}}`
  - `X-XSRF-TOKEN: {{csrfToken}}`
- Body: `form-data` with file field

### 5. Test Scripts (Optional)
Add to requests to auto-save tokens:

```javascript
// For signin request
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    if (jsonData.accessToken) {
        pm.environment.set("accessToken", jsonData.accessToken);
    }
}
```

---

## Quick Testing Workflow

1. **Start Backend**: `cd backend && npm run dev`
2. **Open Postman**: Create new collection
3. **Set Environment**: `baseUrl = http://localhost:3000`
4. **Get CSRF Token**: `GET /api/csrf-token`
5. **Sign Up/In**: `POST /api/auth/signup` or `POST /api/auth/signin`
6. **Save Token**: Copy `accessToken` to environment variable
7. **Test Endpoints**: Use the endpoints listed above

---

## CSRF Token Exceptions

**These endpoints do NOT require CSRF tokens:**
- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `POST /api/auth/refresh`
- `POST /api/admin/analytics/track`
- `GET /api/admin/test-utils/*` (Super Admin only)
- `POST /api/admin/test-utils/*` (Super Admin only)

**All other POST/PUT/PATCH/DELETE requests require CSRF tokens.**

---

## Common Issues & Solutions

### Issue: CSRF Token Error
**Solution**: 
- Make sure you've called `GET /api/csrf-token` first
- Include `X-XSRF-TOKEN` header in request
- Check that cookie `XSRF-TOKEN` is being sent
- Note: Some endpoints don't require CSRF (see exceptions above)

### Issue: 401 Unauthorized
**Solution**:
- Check that `accessToken` is valid and not expired
- Include `Authorization: Bearer {{accessToken}}` header
- Try signing in again to get a new token

### Issue: CORS Error
**Solution**:
- Make sure backend is running
- Check that `CLIENT_URL` in `.env` includes your Postman origin (or use localhost)
- For development, CORS allows `localhost` and `127.0.0.1`

### Issue: Rate Limiting
**Solution**:
- Wait a few seconds between requests
- Check rate limit headers in response
- Use different test accounts if needed

---

## Tips

1. **Use Postman Environments**: Create separate environments for dev/staging/prod
2. **Save Responses**: Use Postman's "Save Response" feature to build test data
3. **Use Variables**: Replace hardcoded IDs with `{{userId}}`, `{{imageId}}`, etc.
4. **Test Scripts**: Add assertions to verify responses
5. **Collection Runner**: Use collection runner to test multiple endpoints in sequence

---

## Quick Reference: All Endpoints Summary

### Public Endpoints (No Auth Required)
- `GET /api/health`
- `GET /api/settings`
- `GET /api/images` (with filters)
- `GET /api/images/locations`
- `GET /api/images/:imageId/view` (PATCH)
- `GET /api/images/:imageId/download` (PATCH)
- `GET /api/images/:imageId/proxy`
- `GET /api/images/:imageId/download`
- `GET /api/images/user/:userId`
- `GET /api/categories`
- `GET /api/users/username/:username`
- `GET /api/users/:userId`
- `GET /api/users/:userId/stats`
- `GET /api/users/:userId/pinned-images`
- `GET /api/follow/:userId/following`
- `GET /api/follow/:userId/followers`
- `GET /api/follow/:userId/stats`
- `GET /api/search/suggestions`
- `GET /api/search/popular`
- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `GET /api/auth/check-email`
- `GET /api/auth/check-username`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `GET /api/auth/google/test`
- `POST /api/admin/analytics/track`

### Protected Endpoints (Auth Required)
All other endpoints require `Authorization: Bearer {{accessToken}}` header.

### Admin Endpoints (Auth + Admin Role Required)
All `/api/admin/*` endpoints require admin permissions.

### Super Admin Endpoints
- `/api/admin/roles/*` (create/update/delete)
- `/api/admin/cache/stats`
- `/api/admin/test-utils/*`

---

## Testing Checklist

Use this checklist to systematically test all endpoints:

### Authentication
- [ ] Sign up
- [ ] Sign in
- [ ] Get CSRF token
- [ ] Refresh token
- [ ] Sign out
- [ ] Get active sessions
- [ ] Sign out all devices

### User Management
- [ ] Get current user (me)
- [ ] Search users
- [ ] Change password
- [ ] Change user info
- [ ] Get user analytics
- [ ] Get user by username
- [ ] Get user by ID
- [ ] Get user stats
- [ ] Track profile view
- [ ] Pin/unpin images
- [ ] Reorder pinned images

### Images
- [ ] Get all images
- [ ] Get images by user
- [ ] Pre-upload image
- [ ] Finalize upload
- [ ] Upload image (legacy)
- [ ] Update image
- [ ] Replace image
- [ ] Batch replace images
- [ ] Increment view
- [ ] Increment download
- [ ] Download image
- [ ] Proxy image

### Categories
- [ ] Get categories
- [ ] Get categories (admin)
- [ ] Create category (admin)
- [ ] Update category (admin)
- [ ] Delete category (admin)

### Favorites
- [ ] Get favorites
- [ ] Check favorites (batch)
- [ ] Toggle favorite

### Collections
- [ ] Get collections
- [ ] Get collection by ID
- [ ] Create collection
- [ ] Update collection
- [ ] Delete collection
- [ ] Add image to collection
- [ ] Remove image from collection
- [ ] Reorder images
- [ ] Add collaborator
- [ ] Remove collaborator
- [ ] Update collaborator permission
- [ ] Export collection
- [ ] Track collection share

### Collection Favorites
- [ ] Get favorite collections
- [ ] Check collection favorites
- [ ] Toggle collection favorite

### Collection Templates
- [ ] Get templates
- [ ] Get template by ID
- [ ] Create template
- [ ] Create collection from template
- [ ] Update template
- [ ] Delete template
- [ ] Save collection as template

### Collection Versions
- [ ] Get collection versions
- [ ] Get version by number
- [ ] Restore version

### Follow
- [ ] Get following
- [ ] Get followers
- [ ] Get user following
- [ ] Get user followers
- [ ] Follow user
- [ ] Unfollow user
- [ ] Get follow stats
- [ ] Get follow status

### Search
- [ ] Get search suggestions
- [ ] Get popular searches

### Notifications
- [ ] Get unread count
- [ ] Get notifications
- [ ] Mark notification as read
- [ ] Mark all as read
- [ ] Delete notification

### Reports
- [ ] Create report
- [ ] Get user reports
- [ ] Get all reports (admin)
- [ ] Update report status (admin)

### Admin
- [ ] Dashboard stats
- [ ] System metrics
- [ ] Analytics
- [ ] Realtime analytics
- [ ] User management
- [ ] Image management
- [ ] Role management
- [ ] Collection management
- [ ] Export data
- [ ] Favorites management
- [ ] Content moderation
- [ ] System logs
- [ ] Settings management
- [ ] Cache stats
- [ ] System announcements
- [ ] Test utilities

---

## Next Steps

1. **Import the guide** into your documentation
2. **Set up Postman environment** with variables
3. **Create a Postman collection** using the endpoints above
4. **Test systematically** using the checklist
5. **Save successful requests** as examples
6. **Create test scripts** for automated validation

---

## Need Help?

If you encounter issues:
1. Check the backend logs for detailed error messages
2. Verify environment variables are set correctly
3. Ensure the backend server is running
4. Check CORS configuration if testing from browser
5. Verify authentication tokens are valid and not expired
