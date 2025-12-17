import express from 'express';
import {
    signUp,
    signIn,
    signOut,
    refreshToken,
    googleAuth,
    googleCallback,
    checkEmailAvailability,
    checkUsernameAvailability,
    getActiveSessions,
    signOutAllDevices,
    signOutSession,
} from '../controllers/authController.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { validateSignUp, validateSignIn } from '../middlewares/validationMiddleware.js';
import { env } from '../libs/env.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';

const router = express.Router();

// Check email availability (for real-time validation)
router.get('/check-email', authLimiter, checkEmailAvailability);

// Check username availability (for real-time validation)
router.get('/check-username', authLimiter, checkUsernameAvailability);

// Apply strict rate limiting and validation to auth endpoints
router.post('/signup', authLimiter, validateSignUp, signUp);
router.post('/signin', authLimiter, validateSignIn, signIn);
router.post('/signout', signOut);
router.post('/refresh', refreshToken);

// Google OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

// Session management routes (require authentication)
router.get('/sessions', protectedRoute, getActiveSessions);
router.post('/sessions/signout-all', protectedRoute, validateCsrf, signOutAllDevices);
router.delete('/sessions/:sessionId', protectedRoute, validateCsrf, signOutSession);

// Test endpoint to check Google OAuth configuration
router.get('/google/test', (req, res) => {
    res.json({
        configured: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
        hasClientId: !!env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!env.GOOGLE_CLIENT_SECRET,
        redirectUri: env.GOOGLE_REDIRECT_URI || 'Not configured',
        backendUrl: env.CLIENT_URL || 'Not configured',
    });
});

// TEMPORARY: Admin creation endpoint (REMOVE AFTER USE!)
// Usage: POST /api/auth/make-admin?username=YOUR_USERNAME&secret=YOUR_SECRET
// Set ADMIN_SECRET in environment variables for security
router.post('/make-admin', async (req, res) => {
    try {
        const { username, secret } = req.query;
        const adminSecret = process.env.ADMIN_SECRET || 'temp-secret-change-me';
        
        // Verify secret
        if (secret !== adminSecret) {
            return res.status(401).json({ message: 'Invalid secret' });
        }
        
        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }
        
        const User = (await import('../models/User.js')).default;
        const AdminRole = (await import('../models/AdminRole.js')).default;
        
        const user = await User.findOne({ username: username.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({ message: `User "${username}" not found` });
        }
        
        // Check if user already has an admin role
        const existingRole = await AdminRole.findOne({ userId: user._id });
        
        if (existingRole) {
            return res.json({ 
                message: `User "${username}" already has an admin role`,
                role: existingRole.role 
            });
        }
        
        // Create AdminRole entry
        const adminRole = await AdminRole.create({
            userId: user._id,
            role: 'admin',
            permissions: {
                // User Management
                viewUsers: true,
                editUsers: true,
                deleteUsers: true,
                banUsers: true,
                unbanUsers: true,
                
                // Image Management
                viewImages: true,
                editImages: true,
                deleteImages: true,
                moderateImages: true,
                
                // Category Management
                viewCategories: true,
                createCategories: true,
                editCategories: true,
                deleteCategories: true,
                
                // Admin Management (view only for admin role)
                viewAdmins: true,
                
                // Dashboard & Analytics
                viewDashboard: true,
                viewAnalytics: true,
                
                // Collections
                viewCollections: true,
                manageCollections: true,
                
                // Favorites
                manageFavorites: true,
                
                // Content Moderation
                moderateContent: true,
                
                // System
                viewLogs: true,
                exportData: true,
                manageSettings: true,
            },
        });
        
        return res.json({ 
            message: `User "${username}" is now an admin!`,
            email: user.email,
            displayName: user.displayName
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error making user admin', error: error.message });
    }
});

export default router;