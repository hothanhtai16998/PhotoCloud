# Color Extraction Migration Script

This script re-processes all existing images with the improved color extraction algorithm.

## Usage

### Basic Usage
```bash
cd backend
node scripts/migrate-color-extraction.js
```

### Dry Run (Test without updating database)
```bash
node scripts/migrate-color-extraction.js --dry-run
```

### Resume from specific image ID
```bash
node scripts/migrate-color-extraction.js --resume=<image_id>
```

## What it does

1. **Connects to MongoDB** database
2. **Fetches all images** in batches (50 at a time)
3. **Downloads each image** from R2 storage
4. **Re-processes colors** using the improved algorithm
5. **Updates database** with new color data
6. **Shows progress** and statistics

## Features

- ✅ **Batch processing** - Processes 50 images at a time
- ✅ **Concurrent processing** - Processes 5 images concurrently per batch
- ✅ **Error handling** - Continues even if some images fail
- ✅ **Progress tracking** - Shows real-time progress and statistics
- ✅ **Dry run mode** - Test without making changes
- ✅ **Resume support** - Can resume from a specific image ID
- ✅ **Skips videos** - Only processes images
- ✅ **Skips missing images** - Handles images without imageUrl gracefully

## Statistics

The script reports:
- Total images found
- Images processed
- Images updated (colors changed)
- Images unchanged (colors same)
- Images skipped (videos, missing URLs, etc.)
- Errors encountered
- Total duration

## Important Notes

⚠️ **This will update all existing images in your database**

- Only updates the `dominantColors` field
- Does NOT modify image files
- Does NOT change image URLs
- Safe to run multiple times (idempotent)

## Example Output

```
[MIGRATION] Connecting to database...
[MIGRATION] Database connected
[MIGRATION] Found 1250 images to process
[MIGRATION] Processing batch 1 (50 images)
[MIGRATION] Progress: 50/1250 (4.0%) | Updated: 42 | Errors: 1 | Skipped: 7
...
[MIGRATION] ===== Migration Complete =====
[MIGRATION] Total images: 1250
[MIGRATION] Processed: 1250
[MIGRATION] Updated: 856
[MIGRATION] Unchanged: 394
[MIGRATION] Skipped: 0
[MIGRATION] Errors: 0
[MIGRATION] Duration: 1245.3s
```

## Troubleshooting

### "MONGODB_URI environment variable is required"
- Make sure your `.env` file has `MONGODB_URI` set
- Or run from the backend directory where `.env` is located

### "Failed to download image"
- Image might be missing from R2 storage
- Check if imageUrl is valid
- Script will skip and continue

### Script is slow
- Normal - processing images takes time
- Adjust `BATCH_SIZE` and `CONCURRENT_PROCESSING` in the script if needed
- For large databases, expect it to take hours

