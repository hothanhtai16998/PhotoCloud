import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        hashedPassword: {
            type: String,
            // Not required - OAuth users don't have passwords
        },
        isOAuthUser: {
            type: Boolean,
            default: false,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        displayName: {
            type: String,
            required: true,
        },
        avatarUrl: {
            type: String,
            default: ''
        },
        avatarId: {
            type: String,
        },
        bio: {
            type: String,
            maxlength: 500,
        },
        phone: {
            type: String,
            sparse: true,
        },
        // COMPUTED FIELDS - Do not write to these fields directly!
        // These are computed from AdminRole model (single source of truth)
        // Use computeAdminStatus() or enrichUserWithAdminStatus() to get computed values
        isAdmin: {
            type: Boolean,
            default: false,
            index: true,
            // NOTE: This field is computed from AdminRole, not written directly
            // The AdminRole model is the single source of truth for admin status
        },
        isSuperAdmin: {
            type: Boolean,
            default: false,
            index: true,
            // NOTE: This field is computed from AdminRole, not written directly
            // The AdminRole model is the single source of truth for super admin status
        },
        // Favorites - array of image IDs that user has favorited
        favorites: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Image',
        }],
        // Favorite Collections - array of collection IDs that user has favorited
        favoriteCollections: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Collection',
        }],
        // Pinned Images - array of image IDs that user has pinned to profile (max 6)
        pinnedImages: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Image',
        }],
        // Ban status
        isBanned: {
            type: Boolean,
            default: false,
            index: true,
        },
        bannedAt: {
            type: Date,
        },
        bannedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        banReason: {
            type: String,
            maxlength: 500,
        },
        location: {
            type: String,
            trim: true,
        },
        website: {
            type: String,
            trim: true,
            validate: {
                validator: function(v) {
                    if (!v) return true; // Allow empty
                    // Basic URL validation
                    try {
                        new URL(v.startsWith('http') ? v : `https://${v}`);
                        return true;
                    } catch {
                        return false;
                    }
                },
                message: 'Website must be a valid URL'
            }
        },
        instagram: {
            type: String,
            trim: true,
            lowercase: true,
        },
        twitter: {
            type: String,
            trim: true,
            lowercase: true,
        },
        facebook: {
            type: String,
            trim: true,
            lowercase: true,
        },
        // Enhanced Profile Statistics
        profileViews: {
            type: Number,
            default: 0,
        },
        lastProfileView: {
            type: Date,
        },
        // Note: totalLikesReceived will be computed from favorites, not stored
    },
    {
        timestamps: true,
    }
);

// Compound indexes for common queries
userSchema.index({ email: 1, isAdmin: 1 }); // For admin queries filtering by email
userSchema.index({ createdAt: -1 }); // For sorting users by creation date
userSchema.index({ username: 1, isAdmin: 1 }); // For admin queries filtering by username

// Text index for fast user search (username, email, displayName)
userSchema.index({ 
	username: 'text', 
	email: 'text', 
	displayName: 'text' 
}, { 
	name: 'user_search_text_index',
	weights: {
		username: 10,  // Username matches are most important
		email: 5,       // Email matches are important
		displayName: 1  // Display name matches are less important
	}
});

const User = mongoose.model("User", userSchema);
export default User;
