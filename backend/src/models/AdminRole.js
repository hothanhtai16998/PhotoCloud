import mongoose from 'mongoose';

const adminRoleSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
            index: true,
        },
        role: {
            type: String,
            enum: ['super_admin', 'admin', 'moderator'],
            default: 'admin',
            required: true,
        },
        permissions: {
            // User Management - Granular permissions
            viewUsers: {
                type: Boolean,
                default: false,
            },
            editUsers: {
                type: Boolean,
                default: false,
            },
            deleteUsers: {
                type: Boolean,
                default: false,
            },
            banUsers: {
                type: Boolean,
                default: false,
            },
            unbanUsers: {
                type: Boolean,
                default: false,
            },
            
            // Image Management - Granular permissions
            viewImages: {
                type: Boolean,
                default: false,
            },
            editImages: {
                type: Boolean,
                default: false,
            },
            deleteImages: {
                type: Boolean,
                default: false,
            },
            moderateImages: {
                type: Boolean,
                default: false,
            },
            
            // Category Management - Granular permissions
            viewCategories: {
                type: Boolean,
                default: false,
            },
            createCategories: {
                type: Boolean,
                default: false,
            },
            editCategories: {
                type: Boolean,
                default: false,
            },
            deleteCategories: {
                type: Boolean,
                default: false,
            },
            
            // Admin Management - Granular permissions (only super_admin can delegate)
            viewAdmins: {
                type: Boolean,
                default: false,
            },
            createAdmins: {
                type: Boolean,
                default: false,
            },
            editAdmins: {
                type: Boolean,
                default: false,
            },
            deleteAdmins: {
                type: Boolean,
                default: false,
            },
            
            // Dashboard & Analytics
            viewDashboard: {
                type: Boolean,
                default: true,
            },
            viewAnalytics: {
                type: Boolean,
                default: false,
            },
            
            // Collections
            viewCollections: {
                type: Boolean,
                default: false,
            },
            manageCollections: {
                type: Boolean,
                default: false,
            },
            
            // Favorites Management
            manageFavorites: {
                type: Boolean,
                default: false,
            },
            
            // Content Moderation (general)
            moderateContent: {
                type: Boolean,
                default: false,
            },
            
            // System & Logs
            viewLogs: {
                type: Boolean,
                default: false,
            },
            exportData: {
                type: Boolean,
                default: false,
            },
            manageSettings: {
                type: Boolean,
                default: false,
            },
        },
        grantedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        // Time-based permissions
        expiresAt: {
            type: Date,
            default: null, // Null means no expiration
            index: true, // Index for efficient expiration queries
        },
        // Conditional permissions
        active: {
            type: Boolean,
            default: true, // Role is active by default
            index: true,
        },
        // IP restrictions (array of allowed IP addresses or CIDR ranges)
        allowedIPs: {
            type: [String], // Array of IP addresses or CIDR ranges (e.g., "192.168.1.1", "10.0.0.0/24")
            default: [], // Empty array means no IP restrictions
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
adminRoleSchema.index({ userId: 1, role: 1 });

const AdminRole = mongoose.model('AdminRole', adminRoleSchema);

export default AdminRole;

