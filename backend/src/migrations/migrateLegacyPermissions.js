import mongoose from 'mongoose';
import { CONNECT_DB } from '../configs/db.js';
import AdminRole from '../models/AdminRole.js';
import { logger } from '../utils/logger.js';
import 'dotenv/config';

/**
 * Migration script to convert legacy permissions to new granular permissions
 * 
 * Legacy permissions mapping:
 * - manageUsers → viewUsers, editUsers
 * - manageImages → viewImages, editImages
 * - manageCategories → viewCategories, createCategories, editCategories
 * - manageAdmins → viewAdmins, createAdmins, editAdmins
 * 
 * Usage: node src/migrations/migrateLegacyPermissions.js
 */

const legacyMappings = {
    'manageUsers': ['viewUsers', 'editUsers'],
    'manageImages': ['viewImages', 'editImages'],
    'manageCategories': ['viewCategories', 'createCategories', 'editCategories'],
    'manageAdmins': ['viewAdmins', 'createAdmins', 'editAdmins'],
};

const migrateLegacyPermissions = async () => {
    try {
        await CONNECT_DB();
        logger.info('🔄 Starting migration of legacy permissions to granular permissions...');

        // Find all admin roles
        const adminRoles = await AdminRole.find({});
        logger.info(`📊 Found ${adminRoles.length} admin role(s) to check`);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const role of adminRoles) {
            let needsUpdate = false;
            const updates = { ...role.permissions.toObject() };

            // Check each legacy permission
            for (const [legacyPerm, newPerms] of Object.entries(legacyMappings)) {
                if (role.permissions[legacyPerm] === true) {
                    logger.info(`  🔍 Found legacy permission "${legacyPerm}" in role for user: ${role.userId}`);
                    
                    // Set corresponding new permissions to true
                    for (const newPerm of newPerms) {
                        if (updates[newPerm] !== true) {
                            updates[newPerm] = true;
                            needsUpdate = true;
                            logger.info(`    ✅ Setting "${newPerm}" to true`);
                        }
                    }
                    
                    // Set legacy permission to false (or remove it)
                    updates[legacyPerm] = false;
                    needsUpdate = true;
                    logger.info(`    🗑️  Removing legacy permission "${legacyPerm}"`);
                }
            }

            if (needsUpdate) {
                // Update the role
                role.permissions = updates;
                await role.save();
                migratedCount++;
                logger.info(`  ✅ Migrated permissions for role: ${role.role} (user: ${role.userId})`);
            } else {
                skippedCount++;
                logger.info(`  ⏭️  Skipped role (no legacy permissions): ${role.role} (user: ${role.userId})`);
            }
        }

        logger.info('\n📈 Migration Summary:');
        logger.info(`   ✅ Migrated: ${migratedCount} role(s)`);
        logger.info(`   ⏭️  Skipped: ${skippedCount} role(s)`);
        logger.info(`   📊 Total: ${adminRoles.length} role(s)`);
        logger.info('\n✅ Migration completed successfully!');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        logger.error('❌ Error during migration:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

// Run migration
migrateLegacyPermissions();

