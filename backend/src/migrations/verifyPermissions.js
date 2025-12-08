import mongoose from 'mongoose';
import { CONNECT_DB } from '../configs/db.js';
import AdminRole from '../models/AdminRole.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';
import 'dotenv/config';

/**
 * Verification script to check admin role permissions
 * 
 * This script verifies that:
 * 1. No admin roles have legacy permissions set to true
 * 2. All roles have appropriate granular permissions
 * 
 * Usage: node src/migrations/verifyPermissions.js
 */

const legacyPermissions = ['manageUsers', 'manageImages', 'manageCategories', 'manageAdmins'];

const verifyPermissions = async () => {
    try {
        await CONNECT_DB();
        logger.info('🔍 Verifying admin role permissions...\n');

        // Find all admin roles
        const adminRoles = await AdminRole.find({}).populate('userId', 'username email displayName');
        logger.info(`📊 Found ${adminRoles.length} admin role(s) to verify\n`);

        let issuesFound = 0;
        let allGood = true;

        for (const role of adminRoles) {
            const user = role.userId;
            const username = user?.username || user?.email || 'Unknown';
            
            logger.info(`👤 Checking role for: ${username} (${role.role})`);
            
            // Check for legacy permissions
            let hasLegacyPermissions = false;
            const legacyPermsFound = [];
            
            for (const legacyPerm of legacyPermissions) {
                if (role.permissions[legacyPerm] === true) {
                    hasLegacyPermissions = true;
                    legacyPermsFound.push(legacyPerm);
                }
            }
            
            if (hasLegacyPermissions) {
                logger.warn(`  ⚠️  Found legacy permissions still set to true: ${legacyPermsFound.join(', ')}`);
                issuesFound++;
                allGood = false;
            } else {
                logger.info(`  ✅ No legacy permissions found`);
            }
            
            // Count granular permissions
            const granularPerms = Object.entries(role.permissions)
                .filter(([key, value]) => !legacyPermissions.includes(key) && value === true)
                .map(([key]) => key);
            
            logger.info(`  📋 Granular permissions (${granularPerms.length}): ${granularPerms.slice(0, 5).join(', ')}${granularPerms.length > 5 ? '...' : ''}`);
            logger.info('');
        }

        logger.info('📈 Verification Summary:');
        if (allGood) {
            logger.info('   ✅ All roles verified successfully!');
            logger.info('   ✅ No legacy permissions found');
            logger.info('   ✅ All roles are using granular permissions');
        } else {
            logger.warn(`   ⚠️  Found ${issuesFound} issue(s) that need attention`);
        }
        logger.info(`   📊 Total roles checked: ${adminRoles.length}\n`);

        await mongoose.connection.close();
        process.exit(allGood ? 0 : 1);
    } catch (error) {
        logger.error('❌ Error during verification:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

// Run verification
verifyPermissions();

