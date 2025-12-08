/**
 * Simple logger utility
 * In production, consider using Winston or Pino
 */

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
    info: (msg, data = '') => {
        if (isDev) console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data);
    },
    debug: (msg, data = '') => {
        if (isDev) console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`, data);
    },
    warn: (msg, data = '') => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data);
    },
    error: (msg, data = '') => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, data);
    },
};

