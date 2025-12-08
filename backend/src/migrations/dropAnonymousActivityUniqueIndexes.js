import mongoose from 'mongoose';
import { env } from '../libs/env.js';

/**
 * Drop unique indexes from AnonymousActivity collection
 * This allows multiple activity records per image (needed for pattern detection)
 */
async function dropUniqueIndexes() {
    try {
        // Connect to database
        console.log('Connecting to MongoDB...');
        await mongoose.connect(env.MONGODB_URI);
        console.log('✓ Connected to MongoDB');
        
        console.log('\nDropping unique indexes from AnonymousActivity collection...');
        
        const collection = mongoose.connection.collection('anonymousactivities');
        
        // Get all indexes
        const indexes = await collection.indexes();
        console.log('Current indexes:', indexes.map(idx => idx.name));
        
        // Drop the unique indexes
        const indexesToDrop = [
            'ipAddress_1_imageId_1_activityType_1',
            'deviceFingerprint_1_imageId_1_activityType_1',
            'sessionId_1_imageId_1_activityType_1',
        ];
        
        for (const indexName of indexesToDrop) {
            try {
                // Try to drop by name first
                await collection.dropIndex(indexName);
                console.log(`✓ Dropped index: ${indexName}`);
            } catch (error) {
                if (error.code === 27) {
                    // Index doesn't exist, that's fine
                    console.log(`- Index ${indexName} doesn't exist, skipping`);
                } else {
                    // Try dropping by key pattern
                    try {
                        const index = indexes.find(idx => idx.name === indexName);
                        if (index) {
                            await collection.dropIndex(index.key);
                            console.log(`✓ Dropped index by key pattern: ${indexName}`);
                        }
                    } catch (err) {
                        console.log(`✗ Could not drop ${indexName}:`, err.message);
                    }
                }
            }
        }
        
        // Verify indexes were dropped
        const remainingIndexes = await collection.indexes();
        console.log('\nRemaining indexes:', remainingIndexes.map(idx => ({ name: idx.name, unique: idx.unique })));
        
        console.log('\n✓ Migration complete!');
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error dropping indexes:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

dropUniqueIndexes();

