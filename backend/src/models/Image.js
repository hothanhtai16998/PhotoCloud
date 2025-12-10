import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
    {
        publicId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        imageTitle: {
            type: String,
            required: false, // Optional - normal users can upload without title (admin adds later)
            trim: true,
            index: true,
        },
        description: {
            type: String,
            required: false,
            trim: true,
            maxlength: 600, // Limit description length
        },
        imageUrl: {
            type: String,
            required: true,
        },
        // Multiple image sizes for progressive loading (like Unsplash)
        thumbnailUrl: {
            type: String,
            // Optional - will fallback to imageUrl if not set
        },
        smallUrl: {
            type: String,
            // Optional - will fallback to imageUrl if not set
        },
        regularUrl: {
            type: String,
            // Optional - will fallback to imageUrl if not set
        },
        // AVIF versions for better compression (modern browsers)
        thumbnailAvifUrl: {
            type: String,
            // Optional - AVIF version of thumbnail
        },
        smallAvifUrl: {
            type: String,
            // Optional - AVIF version of small
        },
        regularAvifUrl: {
            type: String,
            // Optional - AVIF version of regular
        },
        imageAvifUrl: {
            type: String,
            // Optional - AVIF version of original
        },
        // Base64 thumbnail for instant blur-up (like Unsplash)
        base64Thumbnail: {
            type: String,
            // Optional - Tiny base64 BMP (20x20px, 1-2 KB) for instant placeholder
            // Format: data:image/bmp;base64,...
        },
        // Image dimensions (extracted during upload)
        width: {
            type: Number,
            min: 0,
            // Optional - image width in pixels
        },
        height: {
            type: Number,
            min: 0,
            // Optional - image height in pixels
        },
        // Video support (for converted GIFs and direct video uploads)
        isVideo: {
            type: Boolean,
            default: false,
            index: true,
        },
        videoUrl: {
            type: String,
            // Optional - URL to video file (MP4/WebM)
        },
        videoThumbnail: {
            type: String,
            // Optional - Thumbnail image for video preview
        },
        videoDuration: {
            type: Number,
            // Optional - Video duration in seconds
        },
        imageCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: false, // Optional - normal users can upload without category (admin adds later)
            index: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        location: {
            type: String,
            trim: true,
            index: true,
        },
        // GPS coordinates for automatic location detection
        coordinates: {
            latitude: {
                type: Number,
                min: -90,
                max: 90,
            },
            longitude: {
                type: Number,
                min: -180,
                max: 180,
            },
        },
        cameraModel: {
            type: String,
            trim: true,
        },
        // EXIF metadata for camera settings
        cameraMake: {
            type: String,
            trim: true,
        },
        focalLength: {
            type: Number,
            min: 0,
        },
        aperture: {
            type: Number,
            min: 0,
        },
        shutterSpeed: {
            type: String,
            trim: true,
        },
        iso: {
            type: Number,
            min: 0,
        },
        // Dominant colors extracted from image (for color filtering)
        dominantColors: {
            type: [String],
            default: [],
            enum: ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'black', 'white', 'gray'],
        },
        // Tags/keywords for better searchability
        tags: {
            type: [String],
            default: [],
            index: true, // Index for fast tag-based searches
        },
        views: {
            type: Number,
            default: 0,
            min: 0,
        },
        downloads: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Track views per day (date string as key: "YYYY-MM-DD")
        dailyViews: {
            type: Map,
            of: Number,
            default: {},
        },
        // Track downloads per day (date string as key: "YYYY-MM-DD")
        dailyDownloads: {
            type: Map,
            of: Number,
            default: {},
        },
        // Moderation status
        isModerated: {
            type: Boolean,
            default: false,
            index: true,
        },
        moderationStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'flagged'],
            default: 'pending',
            index: true,
        },
        moderatedAt: {
            type: Date,
        },
        moderatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        moderationNotes: {
            type: String,
            maxlength: 500,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for common queries
imageSchema.index({ uploadedBy: 1, createdAt: -1 });
imageSchema.index({ imageCategory: 1, createdAt: -1 });

// Text index for fast full-text search (replaces slow regex queries)
imageSchema.index({
    imageTitle: 'text',
    location: 'text',
    description: 'text'
});

// Compound index for search + category queries
imageSchema.index({ imageCategory: 1, createdAt: -1, imageTitle: 1 });

// Performance optimization indexes
// Compound index for moderation status + date (frequently queried in getAllImages)
imageSchema.index({ moderationStatus: 1, createdAt: -1 });

// Compound index for category + moderation + date (common filter combination)
imageSchema.index({ imageCategory: 1, moderationStatus: 1, createdAt: -1 });

// Index for dominantColors array field (for color filtering)
imageSchema.index({ dominantColors: 1 });

// Compound index for location + date (for location-based queries)
imageSchema.index({ location: 1, createdAt: -1 });

const Image = mongoose.model('Image', imageSchema);

export default Image;