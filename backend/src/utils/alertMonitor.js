import Settings from '../models/Settings.js';
import { getSystemStatus } from './systemMetrics.js';
import { sendAlertEmail } from './emailAlerts.js';
import { logger } from './logger.js';

let monitoringInterval = null;
let lastAlertTimes = {}; // Track when we last sent alerts for each type

// Cache settings to reduce database queries
let cachedSettings = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

/**
 * Get monitoring settings (with caching)
 */
async function getMonitoringSettings() {
    const now = Date.now();
    
    // Return cached settings if still valid
    if (cachedSettings && (now - settingsCacheTime) < SETTINGS_CACHE_TTL) {
        return cachedSettings;
    }
    
    // Fetch from database
    const settings = await Settings.findOne({ key: 'system' });
    if (!settings || !settings.value) {
        return null;
    }
    
    // Cache the settings
    cachedSettings = settings.value;
    settingsCacheTime = now;
    
    return cachedSettings;
}

/**
 * Invalidate settings cache (call when settings are updated)
 */
export function invalidateSettingsCache() {
    cachedSettings = null;
    settingsCacheTime = 0;
}

/**
 * Check if thresholds are exceeded and send alerts
 */
async function checkThresholds() {
    try {
        // Get monitoring settings (cached)
        const monitoringSettings = await getMonitoringSettings();
        if (!monitoringSettings) {
            return;
        }
        
        // Check if health checks are enabled
        if (!monitoringSettings.healthCheckEnabled) {
            return;
        }

        // Get current system status
        const systemStatus = await getSystemStatus();
        
        // Get alert thresholds
        const thresholds = monitoringSettings.alertThresholds || {
            cpuUsage: 80,
            memoryUsage: 85,
            diskUsage: 90,
            responseTime: 1000,
            errorRate: 5,
        };

        // Get alert events configuration
        const alertEvents = monitoringSettings.alertEvents || {};
        
        // Get email alert settings
        const emailAlertsEnabled = monitoringSettings.emailAlertsEnabled || false;
        const emailRecipients = monitoringSettings.emailAlertRecipients || [];

        if (!emailAlertsEnabled || emailRecipients.length === 0) {
            // Alerts disabled or no recipients, just log
            return;
        }

        const alerts = [];
        const now = Date.now();
        const ALERT_COOLDOWN = 15 * 60 * 1000; // 15 minutes between alerts of the same type

        // Check CPU usage
        if (alertEvents.highCpuUsage && systemStatus.cpuUsage !== null && systemStatus.cpuUsage > thresholds.cpuUsage) {
            const alertKey = 'highCpuUsage';
            if (!lastAlertTimes[alertKey] || (now - lastAlertTimes[alertKey]) > ALERT_COOLDOWN) {
                alerts.push({
                    type: 'highCpuUsage',
                    severity: systemStatus.cpuUsage > 90 ? 'critical' : 'warning',
                    message: `High CPU usage detected: ${systemStatus.cpuUsage.toFixed(2)}% (threshold: ${thresholds.cpuUsage}%)`,
                    metric: 'CPU Usage',
                    value: systemStatus.cpuUsage,
                    threshold: thresholds.cpuUsage,
                });
                lastAlertTimes[alertKey] = now;
            }
        }

        // Check memory usage
        if (alertEvents.highMemoryUsage && systemStatus.memoryUsage !== null && systemStatus.memoryUsage > thresholds.memoryUsage) {
            const alertKey = 'highMemoryUsage';
            if (!lastAlertTimes[alertKey] || (now - lastAlertTimes[alertKey]) > ALERT_COOLDOWN) {
                alerts.push({
                    type: 'highMemoryUsage',
                    severity: systemStatus.memoryUsage > 95 ? 'critical' : 'warning',
                    message: `High memory usage detected: ${systemStatus.memoryUsage.toFixed(2)}% (threshold: ${thresholds.memoryUsage}%)`,
                    metric: 'Memory Usage',
                    value: systemStatus.memoryUsage,
                    threshold: thresholds.memoryUsage,
                });
                lastAlertTimes[alertKey] = now;
            }
        }

        // Check disk usage
        if (alertEvents.highDiskUsage && systemStatus.diskUsage !== null && systemStatus.diskUsage > thresholds.diskUsage) {
            const alertKey = 'highDiskUsage';
            if (!lastAlertTimes[alertKey] || (now - lastAlertTimes[alertKey]) > ALERT_COOLDOWN) {
                alerts.push({
                    type: 'highDiskUsage',
                    severity: systemStatus.diskUsage > 95 ? 'critical' : 'warning',
                    message: `High disk usage detected: ${systemStatus.diskUsage}% (threshold: ${thresholds.diskUsage}%)`,
                    metric: 'Disk Usage',
                    value: systemStatus.diskUsage,
                    threshold: thresholds.diskUsage,
                });
                lastAlertTimes[alertKey] = now;
            }
        }

        // Check response time
        if (alertEvents.slowResponseTime && systemStatus.responseTime !== null && systemStatus.responseTime > thresholds.responseTime) {
            const alertKey = 'slowResponseTime';
            if (!lastAlertTimes[alertKey] || (now - lastAlertTimes[alertKey]) > ALERT_COOLDOWN) {
                alerts.push({
                    type: 'slowResponseTime',
                    severity: systemStatus.responseTime > 2000 ? 'critical' : 'warning',
                    message: `Slow response time detected: ${systemStatus.responseTime}ms (threshold: ${thresholds.responseTime}ms)`,
                    metric: 'Response Time',
                    value: systemStatus.responseTime,
                    threshold: thresholds.responseTime,
                });
                lastAlertTimes[alertKey] = now;
            }
        }

        // Check error rate
        if (alertEvents.highErrorRate && systemStatus.errorRate !== null && systemStatus.errorRate > thresholds.errorRate) {
            const alertKey = 'highErrorRate';
            if (!lastAlertTimes[alertKey] || (now - lastAlertTimes[alertKey]) > ALERT_COOLDOWN) {
                alerts.push({
                    type: 'highErrorRate',
                    severity: systemStatus.errorRate > 10 ? 'critical' : 'warning',
                    message: `High error rate detected: ${systemStatus.errorRate.toFixed(2)}% (threshold: ${thresholds.errorRate}%)`,
                    metric: 'Error Rate',
                    value: systemStatus.errorRate,
                    threshold: thresholds.errorRate,
                });
                lastAlertTimes[alertKey] = now;
            }
        }

        // Check database connection
        if (alertEvents.databaseConnectionFailure && systemStatus.databaseStatus === 'disconnected') {
            const alertKey = 'databaseConnectionFailure';
            if (!lastAlertTimes[alertKey] || (now - lastAlertTimes[alertKey]) > ALERT_COOLDOWN) {
                alerts.push({
                    type: 'databaseConnectionFailure',
                    severity: 'critical',
                    message: 'Database connection failure detected',
                    metric: 'Database Status',
                    value: 'disconnected',
                });
                lastAlertTimes[alertKey] = now;
            }
        }

        // Check storage connection
        if (alertEvents.storageConnectionFailure && systemStatus.storageStatus === 'disconnected') {
            const alertKey = 'storageConnectionFailure';
            if (!lastAlertTimes[alertKey] || (now - lastAlertTimes[alertKey]) > ALERT_COOLDOWN) {
                alerts.push({
                    type: 'storageConnectionFailure',
                    severity: 'critical',
                    message: 'Storage connection failure detected',
                    metric: 'Storage Status',
                    value: 'disconnected',
                });
                lastAlertTimes[alertKey] = now;
            }
        }

        // Check overall system status
        if (alertEvents.systemDown && systemStatus.status === 'critical') {
            const alertKey = 'systemDown';
            if (!lastAlertTimes[alertKey] || (now - lastAlertTimes[alertKey]) > ALERT_COOLDOWN) {
                alerts.push({
                    type: 'systemDown',
                    severity: 'critical',
                    message: 'System is in critical state',
                    details: systemStatus,
                });
                lastAlertTimes[alertKey] = now;
            }
        }

        // Send alerts
        for (const alert of alerts) {
            try {
                await sendAlertEmail(emailRecipients, alert);
                logger.info(`Alert sent: ${alert.type}`, { alert });
            } catch (error) {
                logger.error(`Failed to send alert: ${alert.type}`, { error: error.message, alert });
            }
        }

    } catch (error) {
        logger.error('Error checking thresholds', { error: error.message });
    }
}

/**
 * Start monitoring system health and sending alerts
 */
export function startMonitoring() {
    // Clear any existing interval
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }

    // Check immediately
    checkThresholds();

    // Then check at configured interval (default: 60 seconds)
    getMonitoringSettings().then(settings => {
        const interval = (settings?.healthCheckInterval || 60) * 1000;
        monitoringInterval = setInterval(checkThresholds, interval);
        logger.info(`Monitoring started with interval: ${interval}ms`);
    }).catch(error => {
        // Default to 60 seconds if we can't read settings
        const interval = 60 * 1000;
        monitoringInterval = setInterval(checkThresholds, interval);
        logger.info(`Monitoring started with default interval: ${interval}ms`);
    });
}

/**
 * Stop monitoring
 */
export function stopMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        logger.info('Monitoring stopped');
    }
}

