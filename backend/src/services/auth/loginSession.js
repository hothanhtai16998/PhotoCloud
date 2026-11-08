import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import Session from '../../models/Session.js';
import Notification from '../../models/Notification.js';
import { env } from '../../config/env.js';
import { TOKEN } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

export async function createLoginSession(user, userAgent, ipAddress) {
  // Generate access token
  const accessToken = jwt.sign({ userId: user._id }, env.ACCESS_TOKEN_SECRET, {
    expiresIn: TOKEN.ACCESS_TOKEN_TTL,
  });

  // Generate refresh token
  const refreshToken = crypto.randomBytes(64).toString('hex');

  const deviceFingerprint = crypto
    .createHash('sha256')
    .update(`${userAgent}-${ipAddress}`)
    .digest('hex');

  // Check if this is a new device by looking for previous sessions with this fingerprint
  const existingSession = await Session.findOne({
    userId: user._id,
    deviceFingerprint,
    expiresAt: { $gt: new Date() }, // Only check active sessions
  });

  // Create new session with device info
  await Session.create({
    userId: user._id,
    refreshToken,
    expiresAt: new Date(Date.now() + TOKEN.REFRESH_TOKEN_TTL),
    userAgent,
    ipAddress,
    deviceFingerprint,
  });

  // Create login_new_device notification if this is a new device
  if (!existingSession) {
    try {
      await Notification.create({
        recipient: user._id,
        type: 'login_new_device',
        metadata: {
          userAgent,
          ipAddress,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (notifError) {
      logger.error(
        'Failed to create login new device notification:',
        notifError
      );
      // Don't fail login if notification fails
    }
  }

  return { accessToken, refreshToken };
}
