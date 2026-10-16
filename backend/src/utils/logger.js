/**
 * Simple logger utility
 * In production, consider using Winston or Pino
 * Configured to be quiet in development - only errors and warnings shown
 */

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
    info: (msg, data = '') => {
        // Suppress info logs in dev for cleaner terminal
        // Uncomment below to enable: console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data);
    },
    debug: (msg, data = '') => {
        // Suppress debug logs - only show when debugging
        // Uncomment below to enable: console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`, data);
    },
    warn: (msg, data = '') => {
        // Warnings still shown - important for catching issues
        console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data);
    },
    error: (msg, data = '') => {
        // Errors always shown - critical for debugging
        console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, data);
    },
};

