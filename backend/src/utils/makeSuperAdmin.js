import mongoose from 'mongoose';
import { env } from '../libs/env.js';
import User from '../models/User.js';
import AdminRole from '../models/AdminRole.js';
import { CONNECT_DB } from '../configs/db.js';
import { logger } from './logger.js';
import 'dotenv/config';

/**
 * Script to make a user a super admin
 * Usage: node src/utils/makeSuperAdmin.js <username>
 * 
 * Example:
 * node src/utils/makeSuperAdmin.js adminuser
 */

const makeSuperAdmin = async (username) => {
    try {
        if (!username) {
            logger.error('❌ Username is required');
            logger.info('Usage: node src/utils/makeSuperAdmin.js <username>');
            process.exit(1);
        }

        await CONNECT_DB();
        logger.info(`🌱 Making user "${username}" a super admin...`);

        const user = await User.findOne({ username: username.toLowerCase() });

        if (!user) {
            logger.error(`❌ User "${username}" not found`);
            await mongoose.connection.close();
            process.exit(1);
        }

        // Check if user already has a super admin role
        const existingRole = await AdminRole.findOne({ userId: user._id });
        
        if (existingRole && existingRole.role === 'super_admin') {
            logger.info(`✅ User "${username}" is already a super admin`);
            await mongoose.connection.close();
            process.exit(0);
        }

        // If user has a regular admin role, update it to super_admin
        if (existingRole) {
            existingRole.role = 'super_admin';
            // Super admin has all permissions - use new granular permissions
            existingRole.permissions = {
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
                
                // Admin Management
                viewAdmins: true,
                createAdmins: true,
                editAdmins: true,
                deleteAdmins: true,
                
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
            };
            await existingRole.save();
        } else {
            // Create new AdminRole entry with super_admin role
            // Super admin has all permissions - use new granular permissions
            await AdminRole.create({
                userId: user._id,
                role: 'super_admin',
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
                    
                    // Admin Management
                    viewAdmins: true,
                    createAdmins: true,
                    editAdmins: true,
                    deleteAdmins: true,
                    
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
        }

        // Note: isSuperAdmin and isAdmin are computed from AdminRole
        // No need to write to User model - they are computed fields
        // The AdminRole is the single source of truth

        logger.info(`✅ User "${username}" is now a super admin!`);
        logger.info(`   Email: ${user.email}`);
        logger.info(`   Display Name: ${user.displayName}`);
        logger.info(`   Super Admin: Can delegate admin roles and has all permissions`);

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        logger.error('❌ Error making user super admin:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

// Get username from command line arguments
const username = process.argv[2];
makeSuperAdmin(username);

