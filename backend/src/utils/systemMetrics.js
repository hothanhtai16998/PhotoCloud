import os from 'os';
import fs from 'fs/promises';
import { promisify } from 'util';
import { exec } from 'child_process';
import mongoose from 'mongoose';

const execAsync = promisify(exec);

/**
 * Get CPU usage percentage
 * Returns average CPU usage across all cores
 */
export async function getCpuUsage() {
    try {
        // Get CPU times
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;

        cpus.forEach((cpu) => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });

        // Wait a bit and measure again
        await new Promise(resolve => setTimeout(resolve, 1000));

        const cpus2 = os.cpus();
        let totalIdle2 = 0;
        let totalTick2 = 0;

        cpus2.forEach((cpu) => {
            for (const type in cpu.times) {
                totalTick2 += cpu.times[type];
            }
            totalIdle2 += cpu.times.idle;
        });

        const idle = totalIdle2 - totalIdle;
        const total = totalTick2 - totalTick;
        const usage = 100 - ~~(100 * idle / total);

        return Math.max(0, Math.min(100, usage));
    } catch (error) {
        console.error('Error getting CPU usage:', error);
        return null;
    }
}

/**
 * Get memory usage percentage
 */
export function getMemoryUsage() {
    try {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const usagePercent = (usedMemory / totalMemory) * 100;
        return Math.round(usagePercent * 100) / 100;
    } catch (error) {
        console.error('Error getting memory usage:', error);
        return null;
    }
}

/**
 * Get disk usage percentage
 * Returns usage for the root filesystem
 */
export async function getDiskUsage() {
    try {
        // Try to get disk usage using df command (works on Linux/Mac)
        if (process.platform !== 'win32') {
            const { stdout } = await execAsync('df -h /');
            const lines = stdout.trim().split('\n');
            if (lines.length > 1) {
                const parts = lines[1].split(/\s+/);
                const usedPercent = parseInt(parts[4].replace('%', ''));
                return usedPercent;
            }
        }
        
        // Fallback: try to check available space using fs.stat
        // Note: This is a simplified check and may not be accurate on all systems
        try {
            const stats = await fs.stat('.');
            // This is a basic check - in production, use a library like 'diskusage' for accurate disk usage
            // For now, return null if we can't get accurate data
        } catch (err) {
            // stat might not give us disk usage info
        }

        // Windows fallback or if statfs fails
        // Return null to indicate we can't measure
        return null;
    } catch (error) {
        console.error('Error getting disk usage:', error);
        return null;
    }
}

/**
 * Get database connection status
 */
export function getDatabaseStatus() {
    try {
        const state = mongoose.connection.readyState;
        // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
        return state === 1 ? 'connected' : 'disconnected';
    } catch (error) {
        return 'disconnected';
    }
}

/**
 * Get storage connection status
 * This would check your storage provider (R2, S3, etc.)
 * For now, we'll assume connected if we can reach it
 */
export function getStorageStatus() {
    // In a real implementation, you would check your storage provider
    // For now, we'll return 'connected' as a default
    // You can enhance this to actually ping your storage service
    return 'connected';
}

/**
 * Calculate average response time
 * This would typically be tracked over time
 * For now, we'll return a mock value or track it in memory
 */
let responseTimeHistory = [];
const MAX_HISTORY = 100;

export function recordResponseTime(ms) {
    responseTimeHistory.push({
        time: Date.now(),
        ms: ms
    });
    
    // Keep only recent history
    if (responseTimeHistory.length > MAX_HISTORY) {
        responseTimeHistory = responseTimeHistory.slice(-MAX_HISTORY);
    }
}

export function getAverageResponseTime() {
    if (responseTimeHistory.length === 0) {
        return null;
    }
    
    // Get response times from last 5 minutes
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const recent = responseTimeHistory.filter(r => r.time > fiveMinutesAgo);
    
    if (recent.length === 0) {
        return null;
    }
    
    const sum = recent.reduce((acc, r) => acc + r.ms, 0);
    return Math.round(sum / recent.length);
}

/**
 * Calculate error rate
 * This would typically be tracked over time
 * For now, we'll return a mock value or track it in memory
 */
let errorCount = 0;
let requestCount = 0;
const errorRateWindow = 5 * 60 * 1000; // 5 minutes
let errorHistory = [];

export function recordRequest(isError = false) {
    requestCount++;
    if (isError) {
        errorCount++;
        errorHistory.push(Date.now());
    }
    
    // Clean old errors
    const cutoff = Date.now() - errorRateWindow;
    errorHistory = errorHistory.filter(time => time > cutoff);
}

export function getErrorRate() {
    if (requestCount === 0) {
        return 0;
    }
    
    // Calculate error rate from last 5 minutes
    const fiveMinutesAgo = Date.now() - errorRateWindow;
    const recentErrors = errorHistory.filter(time => time > fiveMinutesAgo).length;
    
    // Estimate requests in last 5 minutes (rough approximation)
    // In production, you'd track this more accurately
    const estimatedRequests = Math.max(1, Math.floor(requestCount / 10));
    const rate = (recentErrors / estimatedRequests) * 100;
    
    return Math.round(rate * 100) / 100; // Round to 2 decimal places
}

/**
 * Get comprehensive system status
 */
export async function getSystemStatus() {
    const [cpuUsage, memoryUsage, diskUsage] = await Promise.all([
        getCpuUsage(),
        Promise.resolve(getMemoryUsage()),
        getDiskUsage(),
    ]);

    const databaseStatus = getDatabaseStatus();
    const storageStatus = getStorageStatus();
    const responseTime = getAverageResponseTime();
    const errorRate = getErrorRate();

    // Determine overall status
    let status = 'healthy';
    
    // Check thresholds (default values, should come from settings)
    const thresholds = {
        cpuUsage: 80,
        memoryUsage: 85,
        diskUsage: 90,
        responseTime: 1000,
        errorRate: 5,
    };

    if (
        (cpuUsage !== null && cpuUsage > thresholds.cpuUsage) ||
        (memoryUsage !== null && memoryUsage > thresholds.memoryUsage) ||
        (diskUsage !== null && diskUsage > thresholds.diskUsage) ||
        (responseTime !== null && responseTime > thresholds.responseTime) ||
        (errorRate !== null && errorRate > thresholds.errorRate) ||
        databaseStatus === 'disconnected' ||
        storageStatus === 'disconnected'
    ) {
        status = 'critical';
    } else if (
        (cpuUsage !== null && cpuUsage > 60) ||
        (memoryUsage !== null && memoryUsage > 70) ||
        (diskUsage !== null && diskUsage > 75) ||
        (responseTime !== null && responseTime > 500) ||
        (errorRate !== null && errorRate > 2)
    ) {
        status = 'warning';
    }

    return {
        status,
        cpuUsage,
        memoryUsage,
        diskUsage,
        responseTime,
        errorRate,
        databaseStatus,
        storageStatus,
        timestamp: new Date().toISOString(),
    };
}

