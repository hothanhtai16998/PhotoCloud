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

/**
 * Send email notification to user
 * @param {string} userEmail - User's email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML email content
 * @param {string} textContent - Plain text email content
 */
async function sendUserEmail(userEmail, subject, htmlContent, textContent) {
    try {
        // Initialize transporter if not already done
        if (!transporter) {
            await initializeTransporter();
        }

        if (!transporter) {
            logger.warn('Email transporter not available, cannot send user email');
            return false;
        }

        // Get email settings
        const settings = await Settings.findOne({ key: 'system' });
        const emailSettings = settings?.value || {};
        const fromName = emailSettings.smtpFromName || emailSettings.siteName || 'PhotoCloud';
        const fromEmail = emailSettings.smtpFromEmail || 'noreply@photocloud.com';

        const mailOptions = {
            from: `"${fromName}" <${fromEmail}>`,
            to: userEmail,
            subject,
            text: textContent,
            html: htmlContent,
        };

        await transporter.sendMail(mailOptions);
        logger.info(`User email sent to ${userEmail}`, { subject });
        return true;

    } catch (error) {
        logger.error('Failed to send user email', { error: error.message, email: userEmail });
        return false;
    }
}

/**
 * Send email notification when image processing completes
 * @param {Object} user - User object with email
 * @param {Object} image - Image object
 */
export async function sendImageProcessingCompleteEmail(user, image) {
    if (!user?.email) {
        logger.warn('Cannot send processing email: user email not available');
        return;
    }

    const siteName = (await Settings.findOne({ key: 'system' }))?.value?.siteName || 'PhotoCloud';
    const imageTitle = image.imageTitle || 'Untitled Image';
    const imageUrl = image.imageUrl || '#';
    const status = image.moderationStatus === 'approved' ? 'approved and published' : 'pending review';

    const subject = `Your image "${imageTitle}" has been processed`;
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
                .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
                .image-box { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
                .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
                .status { display: inline-block; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
                .status-approved { background-color: #10b981; color: white; }
                .status-pending { background-color: #f59e0b; color: white; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Image Processing Complete</h2>
                </div>
                <div class="content">
                    <p>Hello ${user.displayName || user.username},</p>
                    <p>Your image <strong>"${imageTitle}"</strong> has been successfully processed and is now ${status}.</p>
                    
                    <div class="image-box">
                        <p><strong>Status:</strong> <span class="status status-${image.moderationStatus === 'approved' ? 'approved' : 'pending'}">${image.moderationStatus === 'approved' ? 'Approved' : 'Pending Review'}</span></p>
                        ${image.moderationStatus === 'pending' ? '<p>Your image is now waiting for admin review. You will be notified once it has been reviewed.</p>' : '<p>Your image is now live and visible to all users!</p>'}
                    </div>
                    
                    <p>
                        <a href="${imageUrl}" class="button">View Image</a>
                    </p>
                    
                    <div class="footer">
                        <p>This is an automated email from ${siteName}.</p>
                        <p>If you have any questions, please contact our support team.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
Image Processing Complete

Hello ${user.displayName || user.username},

Your image "${imageTitle}" has been successfully processed and is now ${status}.

Status: ${image.moderationStatus === 'approved' ? 'Approved' : 'Pending Review'}
${image.moderationStatus === 'pending' ? 'Your image is now waiting for admin review. You will be notified once it has been reviewed.' : 'Your image is now live and visible to all users!'}

View your image: ${imageUrl}

This is an automated email from ${siteName}.
If you have any questions, please contact our support team.
    `;

    await sendUserEmail(user.email, subject, html, text);
}

/**
 * Send email notification when image is approved
 * @param {Object} user - User object with email
 * @param {Object} image - Image object
 */
export async function sendImageApprovedEmail(user, image) {
    if (!user?.email) {
        logger.warn('Cannot send approval email: user email not available');
        return;
    }

    const siteName = (await Settings.findOne({ key: 'system' }))?.value?.siteName || 'PhotoCloud';
    const imageTitle = image.imageTitle || 'Untitled Image';
    const imageUrl = image.imageUrl || '#';

    const subject = `Your image "${imageTitle}" has been approved`;
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #10b981; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
                .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
                .image-box { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #10b981; }
                .button { display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🎉 Image Approved!</h2>
                </div>
                <div class="content">
                    <p>Hello ${user.displayName || user.username},</p>
                    <p>Great news! Your image <strong>"${imageTitle}"</strong> has been approved and is now live on ${siteName}.</p>
                    
                    <div class="image-box">
                        <p>Your image is now visible to all users and can be discovered through search, categories, and collections.</p>
                    </div>
                    
                    <p>
                        <a href="${imageUrl}" class="button">View Image</a>
                    </p>
                    
                    <div class="footer">
                        <p>This is an automated email from ${siteName}.</p>
                        <p>Thank you for contributing to our community!</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
Image Approved

Hello ${user.displayName || user.username},

Great news! Your image "${imageTitle}" has been approved and is now live on ${siteName}.

Your image is now visible to all users and can be discovered through search, categories, and collections.

View your image: ${imageUrl}

This is an automated email from ${siteName}.
Thank you for contributing to our community!
    `;

    await sendUserEmail(user.email, subject, html, text);
}

/**
 * Send email notification when image is rejected
 * @param {Object} user - User object with email
 * @param {Object} image - Image object
 * @param {string} reason - Rejection reason/notes
 */
export async function sendImageRejectedEmail(user, image, reason) {
    if (!user?.email) {
        logger.warn('Cannot send rejection email: user email not available');
        return;
    }

    const siteName = (await Settings.findOne({ key: 'system' }))?.value?.siteName || 'PhotoCloud';
    const imageTitle = image.imageTitle || 'Untitled Image';
    const rejectionReason = reason || 'Your image did not meet our quality standards or content guidelines.';

    const subject = `Your image "${imageTitle}" needs attention`;
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #ef4444; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
                .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
                .image-box { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #ef4444; }
                .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
                .reason-box { background-color: #fef2f2; padding: 15px; margin: 15px 0; border-radius: 5px; border: 1px solid #fecaca; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Image Review Update</h2>
                </div>
                <div class="content">
                    <p>Hello ${user.displayName || user.username},</p>
                    <p>We've reviewed your image <strong>"${imageTitle}"</strong>, and unfortunately it was not approved for publication.</p>
                    
                    <div class="image-box">
                        <div class="reason-box">
                            <p><strong>Reason:</strong></p>
                            <p>${rejectionReason}</p>
                        </div>
                    </div>
                    
                    <p>We encourage you to review our submission guidelines and try uploading again with a different image.</p>
                    
                    <p>
                        <a href="/upload" class="button">Upload New Image</a>
                    </p>
                    
                    <div class="footer">
                        <p>This is an automated email from ${siteName}.</p>
                        <p>If you have questions about this decision, please contact our support team.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
Image Review Update

Hello ${user.displayName || user.username},

We've reviewed your image "${imageTitle}", and unfortunately it was not approved for publication.

Reason:
${rejectionReason}

We encourage you to review our submission guidelines and try uploading again with a different image.

This is an automated email from ${siteName}.
If you have questions about this decision, please contact our support team.
    `;

    await sendUserEmail(user.email, subject, html, text);
}

