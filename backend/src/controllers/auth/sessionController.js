import User from '../../models/User.js';
import jwt from 'jsonwebtoken';
import Session from '../../models/Session.js';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { TOKEN } from '../../utils/constants.js';

export const signOut = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    await Session.deleteOne({ refreshToken: token });
  }

  const isProduction = env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });

  return res.status(200).json({
    message: 'Đăng xuất thành công',
  });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({
      message: 'không tìm thấy Refresh token',
    });
  }

  // Find session
  const session = await Session.findOne({ refreshToken: token });

  if (!session) {
    return res.status(403).json({
      message: 'Refresh token không hợp lệ hoặc đã hết hạn',
    });
  }

  // Check expiration
  const expiresAt = new Date(session.expiresAt).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await Session.deleteOne({ refreshToken: token });
    return res.status(403).json({
      message: 'Refresh token đã hết hạn',
    });
  }

  // Refresh must respect current account state, not just the session's existence.
  const user = await User.findById(session.userId).select('_id isBanned').lean();
  if (!user || user.isBanned) {
    await Session.deleteMany({ userId: session.userId });
    return res.status(403).json({ message: 'Tài khoản không còn được phép đăng nhập' });
  }

  // Generate new access token
  const accessToken = jwt.sign(
    { userId: session.userId },
    env.ACCESS_TOKEN_SECRET,
    { expiresIn: TOKEN.ACCESS_TOKEN_TTL }
  );

  return res.status(200).json({ accessToken });
});

export const getActiveSessions = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const currentRefreshToken = req.cookies?.refreshToken;

  // Get all active sessions for this user
  const sessions = await Session.find({
    userId,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();

  // Format sessions with device info
  const formattedSessions = sessions.map((session) => {
    const isCurrentSession = session.refreshToken === currentRefreshToken;

    // Parse user agent to get device info
    const userAgent = session.userAgent || 'Unknown';
    let deviceName = 'Unknown Device';
    let browserName = 'Unknown Browser';

    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browserName = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browserName = 'Safari';
    } else if (userAgent.includes('Edg')) {
      browserName = 'Edge';
    }

    if (userAgent.includes('Mobile')) {
      deviceName = 'Mobile Device';
    } else if (userAgent.includes('Tablet')) {
      deviceName = 'Tablet';
    } else {
      deviceName = 'Desktop';
    }

    return {
      _id: session._id,
      deviceName,
      browserName,
      ipAddress: session.ipAddress || 'Unknown',
      location: 'Unknown', // Could be enhanced with IP geolocation
      isCurrentSession,
      lastActive: session.updatedAt || session.createdAt,
      createdAt: session.createdAt,
    };
  });

  return res.status(200).json({
    success: true,
    sessions: formattedSessions,
  });
});

export const signOutAllDevices = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const currentRefreshToken = req.cookies?.refreshToken;

  if (!currentRefreshToken) {
    return res.status(400).json({
      success: false,
      message: 'No active session found',
    });
  }

  // Delete all sessions except the current one
  const result = await Session.deleteMany({
    userId,
    refreshToken: { $ne: currentRefreshToken },
    expiresAt: { $gt: new Date() },
  });

  return res.status(200).json({
    success: true,
    message: `Đã đăng xuất ${result.deletedCount} thiết bị khác`,
    deletedCount: result.deletedCount,
  });
});

export const signOutSession = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { sessionId } = req.params;
  const currentRefreshToken = req.cookies?.refreshToken;

  // Find the session
  const session = await Session.findOne({
    _id: sessionId,
    userId,
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy phiên đăng nhập',
    });
  }

  // Prevent signing out the current session (user should use regular sign out)
  if (session.refreshToken === currentRefreshToken) {
    return res.status(400).json({
      success: false,
      message:
        'Không thể đăng xuất phiên hiện tại. Vui lòng sử dụng nút đăng xuất.',
    });
  }

  // Delete the session
  await Session.deleteOne({ _id: sessionId });

  return res.status(200).json({
    success: true,
    message: 'Đã đăng xuất thiết bị thành công',
  });
});
