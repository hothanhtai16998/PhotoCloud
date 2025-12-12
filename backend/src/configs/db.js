import mongoose from 'mongoose';
import { env } from '../libs/env.js';
import { logger } from '../utils/logger.js';

/**
 * Connects to MongoDB database
 */
export const CONNECT_DB = async () => {
    try {
        const options = {
            // Connection pool settings for better performance (optimized)
            maxPoolSize: 20, // Increased from 10 for better concurrency
            minPoolSize: 5, // Minimum number of connections to maintain
            serverSelectionTimeoutMS: 5000, // How long to try selecting a server
            socketTimeoutMS: 45000, // How long to wait for socket operations
            connectTimeoutMS: 10000, // How long to wait for initial connection
        };

        await mongoose.connect(env.MONGODB_URI, options);
        logger.info('✅ MongoDB connected successfully');

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            logger.error('❌ MongoDB connection error', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('⚠️ MongoDB disconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed through app termination');
            process.exit(0);
        });
    } catch (error) {
        logger.error(`❌ Error connecting to MongoDB: ${error.message}`, error);
        process.exit(1);
    }
};