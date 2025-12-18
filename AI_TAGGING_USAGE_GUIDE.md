# AI Tagging Usage Guide

## 📋 Overview

The AI Tagging function automatically generates tags for uploaded images using AI services. It supports multiple providers and can be configured through the admin settings.

## 🚀 How to Use

### 1. Enable AI Tagging

**Via Admin Panel:**
1. Go to **Admin → Settings**
2. Scroll to **AI Tagging** section
3. Check **"Enable AI Tagging"** checkbox
4. Click **Save Settings**

**Via API/Database:**
```javascript
// Update settings in database
const settings = await Settings.findOne({ key: 'system' });
settings.value.aiTagging = {
    enabled: true,
    provider: 'google', // or 'aws' or 'fallback'
    googleApiKey: 'YOUR_API_KEY', // if using Google
    // ... other settings
};
await settings.save();
```

### 2. Configure Provider

#### Option A: Google Cloud Vision API (Recommended)

**Setup Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Cloud Vision API**
4. Create credentials (API Key)
5. Copy the API key
6. In Admin Settings → AI Tagging:
   - Select **Provider: Google**
   - Paste your **Google API Key**
   - Save

**Cost:** ~$1.50 per 1,000 images (first 1,000 free/month)

**Features:**
- Label detection (objects, scenes, concepts)
- Object localization (specific objects in image)
- High accuracy
- Fast response (~500-2000ms)

#### Option B: AWS Rekognition

**Setup Steps:**
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **Rekognition** service
3. Create IAM user with Rekognition permissions
4. Get Access Key ID and Secret Access Key
5. In Admin Settings → AI Tagging:
   - Select **Provider: AWS**
   - Enter **AWS Region** (e.g., `us-east-1`)
   - Enter **Access Key ID**
   - Enter **Secret Access Key**
   - Save

**Cost:** ~$1.00 per 1,000 images (first 5,000 free/month)

**Features:**
- Label detection
- Moderate accuracy
- Fast response (~500-1500ms)

**Note:** Requires `@aws-sdk/client-rekognition` package:
```bash
npm install @aws-sdk/client-rekognition
```

#### Option C: Fallback (No AI)

**When to Use:**
- No API keys available
- Want to disable AI tagging
- Testing without external services

**Behavior:**
- Returns empty tags array
- Upload still succeeds
- No external API calls

### 3. How It Works

**Automatic Process:**
1. User uploads an image
2. Image is processed (resized, converted)
3. **AI Tagging runs automatically** (if enabled)
4. AI tags are merged with user-provided tags
5. Image is saved with all tags

**Code Flow:**
```javascript
// In imageProcessor.js
const aiTags = await generateAITags(buffer, mimetype);
const mergedTags = mergeTags(userTags, aiTags);
// Tags are saved with image
```

### 4. Manual Usage (Programmatic)

**Import the function:**
```javascript
import { generateAITags, mergeTags } from '../utils/aiTaggingService.js';
```

**Generate tags for an image:**
```javascript
// Read image buffer
const imageBuffer = fs.readFileSync('path/to/image.jpg');

// Generate AI tags
const aiTags = await generateAITags(imageBuffer, 'image/jpeg');
console.log('AI Tags:', aiTags);
// Output: ['landscape', 'mountain', 'nature', 'sky', ...]

// Merge with user tags
const userTags = ['vacation', 'hiking'];
const allTags = mergeTags(userTags, aiTags);
console.log('All Tags:', allTags);
// Output: ['vacation', 'hiking', 'landscape', 'mountain', ...]
```

**Parameters:**
- `imageBuffer` (Buffer): Image file buffer
- `mimetype` (string): MIME type (e.g., 'image/jpeg', 'image/png')

**Returns:**
- `Promise<string[]>`: Array of tag strings (normalized, lowercase)

**Limitations:**
- Skips videos (only processes images)
- Skips files > 10MB
- Maximum 20 tags per image
- Tags are normalized (lowercase, trimmed, special chars removed)

### 5. Configuration Options

**Settings Structure:**
```javascript
{
    aiTagging: {
        enabled: true,                    // Enable/disable AI tagging
        provider: 'google',                // 'google', 'aws', or 'fallback'
        googleApiKey: 'YOUR_API_KEY',     // Google Vision API key
        awsRegion: 'us-east-1',           // AWS region
        awsCredentials: {                  // AWS credentials
            accessKeyId: 'YOUR_KEY',
            secretAccessKey: 'YOUR_SECRET'
        }
    }
}
```

### 6. Performance & Costs

**CPU Cost:**
- Base64 encoding: ~50ms
- API call: ~500-2000ms (mostly network latency)
- **Total: ~500-2000ms per image**

**Bandwidth Cost:**
- Base64 encoding increases size by ~33%
- Example: 3MB image → ~4MB base64
- **Total: ~4MB per image** (for API call)

**API Costs:**
- **Google Vision:** $1.50 per 1,000 images
- **AWS Rekognition:** $1.00 per 1,000 images
- **Fallback:** Free (no tags generated)

**Optimization Tips:**
1. **Skip large images:** Already implemented (>10MB skip)
2. **Skip videos:** Already implemented
3. **Cache results:** Consider caching for similar images
4. **Async processing:** Can be moved to background job queue
5. **Batch processing:** Process multiple images in parallel

### 7. Error Handling

**Automatic Fallback:**
- If API key is missing → Falls back to fallback mode
- If API call fails → Falls back to fallback mode
- If image is too large → Skips tagging (upload still succeeds)
- If timeout occurs → Falls back to fallback mode

**Error Logs:**
- Check server logs for `[AI Tagging]` messages
- Errors are logged but don't fail the upload

### 8. Testing

**Test with Google Vision:**
```javascript
const { generateAITags } = require('./utils/aiTaggingService.js');
const fs = require('fs');

// Test image
const buffer = fs.readFileSync('test-image.jpg');
const tags = await generateAITags(buffer, 'image/jpeg');
console.log('Generated tags:', tags);
```

**Test in Admin Panel:**
1. Enable AI Tagging
2. Configure provider and API key
3. Upload a test image
4. Check image tags in database or UI
5. Verify tags were generated

### 9. Troubleshooting

**Problem: No tags generated**
- ✅ Check if AI Tagging is enabled in settings
- ✅ Verify API key is correct (for Google/AWS)
- ✅ Check image size (< 10MB)
- ✅ Check if image is video (videos are skipped)
- ✅ Check server logs for errors

**Problem: Slow uploads**
- AI Tagging adds 0.5-2 seconds to upload time
- Consider moving to background job queue
- Or disable for high-traffic periods

**Problem: API errors**
- Check API key validity
- Check API quota/limits
- Check network connectivity
- Verify billing is enabled (for Google Cloud)

**Problem: High costs**
- Monitor API usage in provider dashboard
- Set up billing alerts
- Consider using fallback for non-critical images
- Implement rate limiting

### 10. Best Practices

1. **Start with Google Vision** (best accuracy)
2. **Monitor API costs** regularly
3. **Set up billing alerts** in cloud console
4. **Use fallback** for development/testing
5. **Cache results** for similar images (future enhancement)
6. **Move to background** for better user experience
7. **Combine with user tags** (already implemented)
8. **Review generated tags** periodically for quality

### 11. Example Configuration

**Complete Settings Example:**
```javascript
{
    key: 'system',
    value: {
        aiTagging: {
            enabled: true,
            provider: 'google',
            googleApiKey: 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
            // Optional: Customize confidence threshold
            minConfidence: 0.5,  // 50% confidence minimum
            maxTags: 20          // Maximum tags per image
        }
    }
}
```

### 12. Integration Points

**Where AI Tagging is Called:**
- `backend/src/workers/imageProcessor.js` (line 76)
- Automatically during image upload processing
- Runs synchronously (blocks upload completion)

**Future Enhancement:**
- Move to background job queue
- Process asynchronously after upload
- Update image tags when ready

---

## 📊 Cost Calculator

**Monthly Cost Estimate:**

For **1,000 images/month:**
- Google Vision: **$1.50** (first 1,000 free)
- AWS Rekognition: **$1.00** (first 5,000 free)
- Fallback: **$0.00**

For **10,000 images/month:**
- Google Vision: **$13.50** ($1.50 × 9,000)
- AWS Rekognition: **$5.00** ($1.00 × 5,000)
- Fallback: **$0.00**

For **100,000 images/month:**
- Google Vision: **$148.50** ($1.50 × 99,000)
- AWS Rekognition: **$95.00** ($1.00 × 95,000)
- Fallback: **$0.00**

---

## 🔧 Advanced Usage

### Custom Tag Processing

```javascript
import { generateAITags, cleanTags } from '../utils/aiTaggingService.js';

// Generate tags
const rawTags = await generateAITags(buffer, mimetype);

// Custom processing
const customTags = rawTags
    .filter(tag => !tag.includes('unwanted'))
    .map(tag => tag.replace('_', ' '))
    .slice(0, 10); // Limit to 10 tags
```

### Batch Processing

```javascript
// Process multiple images
const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
const results = await Promise.all(
    images.map(async (path) => {
        const buffer = fs.readFileSync(path);
        const tags = await generateAITags(buffer, 'image/jpeg');
        return { path, tags };
    })
);
```

---

## 📝 Summary

**Quick Start:**
1. Enable in Admin Settings
2. Choose provider (Google recommended)
3. Add API key
4. Save settings
5. Upload images → Tags generated automatically!

**Key Points:**
- ✅ Automatic during upload
- ✅ Supports Google Vision, AWS Rekognition, or Fallback
- ✅ Non-blocking (doesn't fail upload if tagging fails)
- ✅ Merges with user-provided tags
- ✅ Normalizes and cleans tags automatically
- ⚠️ Adds 0.5-2 seconds to upload time
- ⚠️ Costs $1-1.50 per 1,000 images (with API providers)

