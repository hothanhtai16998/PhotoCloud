import mongoose from 'mongoose';
import { env } from '../libs/env.js';
import { logger } from '../utils/logger.js';

let isIntentionalClose = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Attempts to reconnect to MongoDB
 */
const reconnectDB = async () => {
    if (isIntentionalClose || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            logger.error(`❌ MongoDB reconnection failed after ${MAX_RECONNECT_ATTEMPTS} attempts`);
        }
        return;
    }

    reconnectAttempts++;
    logger.info(`🔄 Attempting to reconnect to MongoDB (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

    try {
        const options = {
            maxPoolSize: 10,
            minPoolSize: 5,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
        };

        await mongoose.connect(env.MONGODB_URI, options);
        logger.info('✅ MongoDB reconnected successfully');
        reconnectAttempts = 0; // Reset counter on successful reconnection
    } catch (error) {
        logger.error(`❌ MongoDB reconnection attempt ${reconnectAttempts} failed: ${error.message}`);
        
        // Wait before next attempt (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 10000);
        setTimeout(() => reconnectDB(), delay);
    }
};

/**
 * Connects to MongoDB database
 */
export const CONNECT_DB = async () => {
    try {
        const options = {
            // Connection pool settings for better performance
            maxPoolSize: 10, // Maximum number of connections in the pool
            minPoolSize: 5, // Minimum number of connections to maintain
            serverSelectionTimeoutMS: 5000, // How long to try selecting a server
            socketTimeoutMS: 45000, // How long to wait for socket operations
            connectTimeoutMS: 10000, // How long to wait for initial connection
            // Auto-reconnect settings
            autoIndex: true,
            retryWrites: true,
        };

        await mongoose.connect(env.MONGODB_URI, options);
        logger.info('✅ MongoDB connected successfully');
        reconnectAttempts = 0; // Reset on successful connection

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            logger.error('❌ MongoDB connection error:', err.message);
        });

        mongoose.connection.on('disconnected', () => {
            if (!isIntentionalClose) {
                logger.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
                reconnectDB();
            } else {
                logger.info('ℹ️ MongoDB disconnected (intentional)');
            }
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('✅ MongoDB reconnected successfully');
            reconnectAttempts = 0;
        });

        mongoose.connection.on('connecting', () => {
            logger.info('🔄 Connecting to MongoDB...');
        });

        mongoose.connection.on('connected', () => {
            logger.info('✅ MongoDB connection established');
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            logger.info(`\n📴 Received ${signal}. Closing MongoDB connection gracefully...`);
            isIntentionalClose = true;
            try {
                await mongoose.connection.close();
                logger.info('✅ MongoDB connection closed through app termination');
                process.exit(0);
            } catch (error) {
                logger.error('❌ Error closing MongoDB connection:', error);
                process.exit(1);
            }
        };

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    } catch (error) {
        logger.error(`❌ Error connecting to MongoDB: ${error.message}`, error);
        process.exit(1);
    }
};