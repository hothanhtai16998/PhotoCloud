import { normalizeAccountIdentifier as normalizeEmail } from '../../utils/accountIdentifier.js';
import { createLoginSession } from '../../services/auth/loginSession.js';
import User from '../../models/User.js';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { TOKEN } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';
import { getClientIp } from '../../services/audit/auditLogger.js';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET || '';
// Backend callback URL - Google will redirect here with the code
// In production, GOOGLE_REDIRECT_URI must be explicitly set in environment variables
const GOOGLE_REDIRECT_URI = env.GOOGLE_REDIRECT_URI;

export const googleAuth = asyncHandler(async (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    logger.error(
      'Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI'
    );
    return res.status(500).json({
      message:
        'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI in environment variables.',
    });
  }

  const state = crypto.randomBytes(32).toString('hex');
  // Store state in session or cookie for CSRF protection
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600000, // 10 minutes
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&response_type=code&scope=openid email profile&state=${state}&access_type=offline&prompt=consent`;

  logger.debug('Google OAuth - Redirecting to:', googleAuthUrl);
  logger.debug('Redirect URI:', GOOGLE_REDIRECT_URI);

  res.redirect(googleAuthUrl);
});

export const googleCallback = asyncHandler(async (req, res) => {
  const { code, state, error, error_description } = req.query;

  // Handle Google OAuth errors
  if (error) {
    logger.error('Google OAuth error:', { error, error_description });
    if (!env.CLIENT_URL) {
      logger.error('CLIENT_URL không được để trống');
      return res.status(500).json({ message: 'Lỗi server' });
    }
    return res.redirect(
      `${env.CLIENT_URL}/signin?error=${encodeURIComponent(error_description || error)}`
    );
  }

  const storedState = req.cookies?.oauth_state;

  // Verify state to prevent CSRF attacks
  if (!state || state !== storedState) {
    logger.error('OAuth state mismatch', { ip: req.ip });
    if (!env.CLIENT_URL) {
      logger.error('CLIENT_URL không được để trống');
      return res.status(500).json({ message: 'Lỗi server' });
    }
    return res.redirect(
      `${env.CLIENT_URL}/signin?error=Invalid state parameter`
    );
  }

  if (!code) {
    logger.error('No authorization code provided in OAuth callback');
    if (!env.CLIENT_URL) {
      logger.error('CLIENT_URL not configured');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    return res.redirect(
      `${env.CLIENT_URL}/signin?error=Authorization code not provided`
    );
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    logger.error('Google OAuth not configured - missing credentials');
    if (!env.CLIENT_URL) {
      logger.error('CLIENT_URL not configured');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    return res.redirect(
      `${env.CLIENT_URL}/signin?error=Google OAuth is not configured`
    );
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      logger.error('Failed to get access token from Google', { status: tokenResponse.status });
      if (!env.CLIENT_URL) {
        logger.error('CLIENT_URL not configured');
        return res.status(500).json({ message: 'Server configuration error' });
      }
      return res.redirect(
        `${env.CLIENT_URL}/signin?error=Failed to get access token from Google`
      );
    }

    // Get user info from Google
    const userResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const googleUser = await userResponse.json();

    if (!googleUser.id) {
      logger.error('Failed to get user info from Google', { googleUser });
      if (!env.CLIENT_URL) {
        logger.error('CLIENT_URL not configured');
        return res.status(500).json({ message: 'Server configuration error' });
      }
      return res.redirect(
        `${env.CLIENT_URL}/signin?error=Failed to get user info from Google`
      );
    }

    // Find or create user
    let user = await User.findOne({ email: googleUser.email });

    // Check if user is banned (before creating new user)
    if (user && user.isBanned) {
      if (!env.CLIENT_URL) {
        logger.error('CLIENT_URL not configured');
        return res.status(500).json({ message: 'Server configuration error' });
      }
      return res.redirect(
        `${env.CLIENT_URL}/signin?error=${encodeURIComponent(`Tài khoản của bạn đã bị cấm. Lý do: ${user.banReason || 'Không có lý do'}`)}`
      );
    }

    if (!user) {
      // Create new user from Google data
      const username = `google_${googleUser.id}`;

      user = await User.create({
        username,
        email: normalizeEmail(
          googleUser.email || `${googleUser.id}@google.com`
        ),
        displayName: String(googleUser.name || 'Google User'),
        avatarUrl: googleUser.picture ? String(googleUser.picture) : undefined,
        isOAuthUser: true,
        // No password for OAuth users
      });
    } else {
      // User exists - check if they're trying to use Google login on a password account
      if (!user.isOAuthUser) {
        // User exists with password account, prevent Google login
        if (!env.CLIENT_URL) {
          logger.error('CLIENT_URL not configured');
          return res
            .status(500)
            .json({ message: 'Server configuration error' });
        }
        return res.redirect(
          `${env.CLIENT_URL}/signin?error=${encodeURIComponent('This email is already registered with email/password. Please sign in with your password instead.')}`
        );
      }

      // For existing OAuth users, always sync avatar from Google to keep it up to date
      if (googleUser.picture) {
        // Only update if it's different (to avoid unnecessary saves)
        if (user.avatarUrl !== googleUser.picture) {
          user.avatarUrl = googleUser.picture;
          // Clear avatarId since we're using Google's avatar
          user.avatarId = undefined;
          await user.save();
        }
      }
    }

    const { accessToken, refreshToken } = await createLoginSession(
      user,
      req.headers['user-agent'] || 'Unknown',
      getClientIp(req)
    );

    // Set refresh token cookie
    const isProduction = env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: TOKEN.REFRESH_TOKEN_TTL,
    });

    // Clear OAuth state cookie
    res.clearCookie('oauth_state');

    // Redirect to frontend with token
    if (!env.CLIENT_URL) {
      logger.error('CLIENT_URL not configured');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    logger.info('Google OAuth success - redirecting to frontend with token', {
      userId: user._id,
    });
    res.redirect(`${env.CLIENT_URL}/auth/google/callback?token=${accessToken}`);
  } catch (error) {
    logger.error('Google OAuth error:', error);
    if (!env.CLIENT_URL) {
      logger.error('CLIENT_URL not configured');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    const errorMessage = error.message || 'Failed to authenticate with Google';
    return res.redirect(
      `${env.CLIENT_URL}/signin?error=${encodeURIComponent(errorMessage)}`
    );
  }
});
