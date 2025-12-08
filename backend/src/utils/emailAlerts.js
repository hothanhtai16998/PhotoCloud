import Settings from '../models/Settings.js';
import nodemailer from 'nodemailer';
import { logger } from './logger.js';

let transporter = null;

/**
 * Initialize email transporter from settings
 */
async function initializeTransporter() {
    try {
        const settings = await Settings.findOne({ key: 'system' });
        if (!settings || !settings.value) {
            return null;
        }

        const emailSettings = settings.value;
        
        // Check if SMTP is enabled
        if (!emailSettings.smtpEnabled) {
            return null;
        }

        // Create transporter
        transporter = nodemailer.createTransport({
            host: emailSettings.smtpHost,
            port: emailSettings.smtpPort || 587,
            secure: emailSettings.smtpSecure || false,
            auth: {
                user: emailSettings.smtpUser,
                pass: emailSettings.smtpPassword,
            },
        });

        // Verify connection
        await transporter.verify();
        logger.info('Email transporter initialized successfully');
        
        return transporter;
    } catch (error) {
        logger.error('Failed to initialize email transporter', { error: error.message });
        return null;
    }
}

/**
 * Send alert email
 */
export async function sendAlertEmail(recipients, alert) {
    try {
        // Initialize transporter if not already done
        if (!transporter) {
            await initializeTransporter();
        }

        if (!transporter) {
            logger.warn('Email transporter not available, cannot send alert');
            return;
        }

        // Get email settings
        const settings = await Settings.findOne({ key: 'system' });
        const emailSettings = settings?.value || {};
        const fromName = emailSettings.smtpFromName || emailSettings.siteName || 'PhotoApp';
        const fromEmail = emailSettings.smtpFromEmail || 'noreply@photoapp.com';

        // Determine severity color
        const severityColors = {
            critical: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6',
        };

        const severityColor = severityColors[alert.severity] || severityColors.info;

        // Build email content
        const subject = `[${alert.severity.toUpperCase()}] System Alert: ${alert.metric || alert.type}`;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: ${severityColor}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
                    .alert-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${severityColor}; }
                    .metric { display: flex; justify-content: space-between; margin: 10px 0; }
                    .label { font-weight: bold; }
                    .value { color: ${severityColor}; }
                    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>System Alert</h2>
                    </div>
                    <div class="content">
                        <div class="alert-box">
                            <h3>${alert.message}</h3>
                            ${alert.metric ? `
                                <div class="metric">
                                    <span class="label">Metric:</span>
                                    <span class="value">${alert.metric}</span>
                                </div>
                            ` : ''}
                            ${alert.value !== undefined ? `
                                <div class="metric">
                                    <span class="label">Current Value:</span>
                                    <span class="value">${alert.value}${alert.metric === 'Response Time' ? 'ms' : alert.metric === 'Error Rate' || alert.metric === 'CPU Usage' || alert.metric === 'Memory Usage' || alert.metric === 'Disk Usage' ? '%' : ''}</span>
                                </div>
                            ` : ''}
                            ${alert.threshold !== undefined ? `
                                <div class="metric">
                                    <span class="label">Threshold:</span>
                                    <span>${alert.threshold}${alert.metric === 'Response Time' ? 'ms' : '%'}</span>
                                </div>
                            ` : ''}
                            <div class="metric">
                                <span class="label">Severity:</span>
                                <span class="value" style="text-transform: uppercase;">${alert.severity}</span>
                            </div>
                            <div class="metric">
                                <span class="label">Time:</span>
                                <span>${new Date().toLocaleString()}</span>
                            </div>
                        </div>
                        <div class="footer">
                            <p>This is an automated alert from ${fromName} monitoring system.</p>
                            <p>Please investigate and take appropriate action.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
System Alert: ${alert.message}

${alert.metric ? `Metric: ${alert.metric}` : ''}
${alert.value !== undefined ? `Current Value: ${alert.value}` : ''}
${alert.threshold !== undefined ? `Threshold: ${alert.threshold}` : ''}
Severity: ${alert.severity.toUpperCase()}
Time: ${new Date().toLocaleString()}

This is an automated alert from ${fromName} monitoring system.
Please investigate and take appropriate action.
        `;

        // Send email to all recipients
        const mailOptions = {
            from: `"${fromName}" <${fromEmail}>`,
            to: recipients.join(', '),
            subject,
            text,
            html,
        };

        await transporter.sendMail(mailOptions);
        logger.info(`Alert email sent to ${recipients.length} recipient(s)`, { alertType: alert.type });
        
    } catch (error) {
        logger.error('Failed to send alert email', { error: error.message, alert });
        throw error;
    }
}

/**
 * Reinitialize transporter (call when SMTP settings change)
 */
export async function reinitializeTransporter() {
    transporter = null;
    await initializeTransporter();
}

