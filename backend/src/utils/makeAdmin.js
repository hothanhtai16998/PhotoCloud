import mongoose from 'mongoose';
import { env } from '../libs/env.js';
import User from '../models/User.js';
import AdminRole from '../models/AdminRole.js';
import { CONNECT_DB } from '../configs/db.js';
import { logger } from './logger.js';
import 'dotenv/config';

/**
 * Script to make a user an admin
 * Usage: node src/utils/makeAdmin.js <username>
 * 
 * Example:
 * node src/utils/makeAdmin.js adminuser
 */

const makeAdmin = async (username) => {
    try {
        if (!username) {
            logger.error('❌ Username is required');
            logger.info('Usage: node src/utils/makeAdmin.js <username>');
            process.exit(1);
        }

        await CONNECT_DB();
        logger.info(`🌱 Making user "${username}" an admin...`);

        const user = await User.findOne({ username: username.toLowerCase() });

        if (!user) {
            logger.error(`❌ User "${username}" not found`);
            await mongoose.connection.close();
            process.exit(1);
        }

        // Check if user already has an admin role
        const existingRole = await AdminRole.findOne({ userId: user._id });
        
        if (existingRole) {
            logger.info(`✅ User "${username}" already has an admin role`);
            logger.info(`   Role: ${existingRole.role}`);
            await mongoose.connection.close();
            process.exit(0);
        }

        // Create AdminRole entry (single source of truth)
        // Use new granular permissions instead of legacy permissions
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

        // Note: isAdmin is computed from AdminRole
        // No need to write to User model - it is a computed field
        // The AdminRole is the single source of truth

        logger.info(`✅ User "${username}" is now an admin!`);
        logger.info(`   Email: ${user.email}`);
        logger.info(`   Display Name: ${user.displayName}`);
        logger.info(`   Admin Role created with full permissions (except admin management)`);

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        logger.error('❌ Error making user admin:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

// Get username from command line arguments
const username = process.argv[2];
makeAdmin(username);

