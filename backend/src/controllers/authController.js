import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Session from "../models/Session.js";
import Notification from "../models/Notification.js";
import { env } from "../libs/env.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { TOKEN } from "../utils/constants.js";
import { logger } from "../utils/logger.js";
import { getClientIp } from "../utils/auditLogger.js";

// Google OAuth configuration
const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET || '';
// Backend callback URL - Google will redirect here with the code
// In production, GOOGLE_REDIRECT_URI must be explicitly set in environment variables
const GOOGLE_REDIRECT_URI = env.GOOGLE_REDIRECT_URI;

// Helpers
const normalizeEmail = (email) => (email ? String(email).toLowerCase().trim() : undefined);
const normalizeUsername = (username) => (username ? String(username).toLowerCase().trim() : undefined);

// Check if email is available
export const checkEmailAvailability = asyncHandler(async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
        if (existingUser.isOAuthUser) {
            return res.status(409).json({
                available: false,
                message: "Email này đã đăng ký với tài khoản Google, xin vui lòng đăng nhập bằng Google."
            });
        }
        return res.status(409).json({
            available: false,
            message: "Email đã tồn tại"
        });
    }

    return res.status(200).json({ available: true });
});

// Check if username is available
export const checkUsernameAvailability = asyncHandler(async (req, res) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ message: "Username is required" });
    }

    const normalizedUsername = normalizeUsername(username);
    const existingUser = await User.findOne({ username: normalizedUsername });

    if (existingUser) {
        return res.status(409).json({
            available: false,
            message: "Tên tài khoản đã tồn tại"
        });
    }

    return res.status(200).json({ available: true });
});

export const signUp = asyncHandler(async (req, res) => {
    const { username, password, email, firstName, lastName, phone, bio } = req.body;

    // Note: Input validation is handled by validationMiddleware
    // This is just for data extraction

    // Validate password is provided for regular signup
    if (!password) {
        return res.status(400).json({ message: "Mật khẩu không được để trống" });
    }

    // Normalize inputs
    const normalizedEmail = normalizeEmail(email);
    const normalizedUsername = normalizeUsername(username);

    // Check if username or email already exists
    const existingUser = await User.findOne({
        $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });

    if (existingUser) {
        // Compare normalized values to avoid case-sensitivity issues
        if (existingUser.username && normalizedUsername && normalizeUsername(existingUser.username) === normalizedUsername) {
            return res.status(409).json({ message: "Tên tài khoản đã tồn tại" });
        }
        if (existingUser.email && normalizedEmail && normalizeEmail(existingUser.email) === normalizedEmail) {
            if (existingUser.isOAuthUser) {
                return res.status(409).json({
                    message: "Email này đã đăng ký với tài khoản Google, xin vui lòng đăng nhập bằng Google."
                });
            }
            return res.status(409).json({ message: "Email đã tồn tại" });
        }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Build displayName safely
    const safeFirst = (firstName || '').toString().trim();
    const safeLast = (lastName || '').toString().trim();
    const displayName = `${safeFirst} ${safeLast}`.trim() || normalizedUsername || undefined;

    // Create new user
    await User.create({
        username: normalizedUsername,
        hashedPassword,
        email: normalizedEmail,
        displayName,
        isOAuthUser: false,
        phone: String(phone || '').trim() || undefined,
        bio: String(bio || '').trim() || undefined,
    });

    return res.status(201).json({
        message: "Tạo tài khoản thành công",
    });
});

export const signIn = asyncHandler(async (req, res) => {
    let { username, password } = req.body;

    // Note: Input validation is handled by validationMiddleware

    // Normalize identifier (allow either username or email)
    const identifier = String(username || '').trim();
    let query;
    if (identifier.includes('@')) {
        const normalized = normalizeEmail(identifier);
        query = { email: normalized };
    } else {
        const normalized = normalizeUsername(identifier);
        query = { username: normalized };
    }

    // Find user by the selected identifier
    const user = await User.findOne(query);

    if (!user) {
        return res.status(401).json({
            message: "Tên tài khoản hoặc mật khẩu không đúng",
        });
    }

    // Check if user is banned
    if (user.isBanned) {
        return res.status(403).json({
            message: `Tài khoản của bạn đã bị cấm. Lý do: ${user.banReason || 'Không có lý do'}`,
        });
    }

    // Check if user is OAuth user (no password)
    if (user.isOAuthUser) {
        return res.status(401).json({
            message: "This account was created with social login. Please use social login to sign in.",
        });
    }

    // Verify password
    if (!user.hashedPassword) {
        return res.status(401).json({
            message: "Tên tài khoản hoặc mật khẩu không đúng",
        });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.hashedPassword);

    if (!isPasswordMatch) {
        return res.status(401).json({
            message: "Tên tài khoản hoặc mật khẩu không đúng",
        });
    }

    // Generate access token
    const accessToken = jwt.sign(
        { userId: user._id },
        env.ACCESS_TOKEN_SECRET,
        { expiresIn: TOKEN.ACCESS_TOKEN_TTL }
    );

    // Generate refresh token
    const refreshToken = crypto.randomBytes(64).toString("hex");

    // Get device information
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = getClientIp(req);
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
            logger.error('Failed to create login new device notification:', notifError);
            // Don't fail login if notification fails
        }
    }

    // Set refresh token cookie
    const isProduction = env.NODE_ENV === "production";
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: TOKEN.REFRESH_TOKEN_TTL,
    });

    // Compute admin status from AdminRole (single source of truth)
    const { enrichUserWithAdminStatus } = await import("../utils/adminUtils.js");
    const enrichedUser = await enrichUserWithAdminStatus(user.toObject ? user.toObject() : user);

    return res.status(200).json({
        message: "Đăng nhập thành công",
        accessToken,
        user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            isAdmin: enrichedUser.isAdmin || false,
            isSuperAdmin: enrichedUser.isSuperAdmin || false,
            permissions: enrichedUser.permissions || null,
        },
    });
});

export const signOut = asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken;

    if (token) {
        await Session.deleteOne({ refreshToken: token });
    }

    const isProduction = env.NODE_ENV === "production";
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
    });

    return res.status(200).json({
        message: "Đăng xuất thành công",
    });
});

export const refreshToken = asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken;

    if (!token) {
        return res.status(401).json({
            message: "không tìm thấy Refresh token",
        });
    }

    // Find session
    const session = await Session.findOne({ refreshToken: token });

    if (!session) {
        return res.status(403).json({
            message: "Refresh token không hợp lệ hoặc đã hết hạn",
        });
    }

    // Check expiration
    if (session.expiresAt < new Date()) {
        await Session.deleteOne({ refreshToken: token });
        return res.status(403).json({
            message: "Refresh token đã hết hạn",
        });
    }

    // Generate new access token
    const accessToken = jwt.sign(
        { userId: session.userId },
        env.ACCESS_TOKEN_SECRET,
        { expiresIn: TOKEN.ACCESS_TOKEN_TTL }
    );

    return res.status(200).json({ accessToken });
});

// Google OAuth - Initiate login
export const googleAuth = asyncHandler(async (req, res) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
        logger.error('Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI');
        return res.status(500).json({
            message: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI in environment variables.",
        });
    }

    const state = crypto.randomBytes(32).toString('hex');
    // Store state in session or cookie for CSRF protection
    res.cookie('oauth_state', state, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600000 // 10 minutes
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&response_type=code&scope=openid email profile&state=${state}&access_type=offline&prompt=consent`;

    logger.debug('Google OAuth - Redirecting to:', googleAuthUrl);
    logger.debug('Redirect URI:', GOOGLE_REDIRECT_URI);

    res.redirect(googleAuthUrl);
});

// Google OAuth - Handle callback
export const googleCallback = asyncHandler(async (req, res) => {
    const { code, state, error, error_description } = req.query;

    // Handle Google OAuth errors
    if (error) {
        logger.error('Google OAuth error:', { error, error_description });
        if (!env.CLIENT_URL) {
            logger.error('CLIENT_URL not configured');
            return res.status(500).json({ message: 'Server configuration error' });
        }
        return res.redirect(`${env.CLIENT_URL}/signin?error=${encodeURIComponent(error_description || error)}`);
    }

    const storedState = req.cookies?.oauth_state;

    // Verify state to prevent CSRF attacks
    if (!state || state !== storedState) {
        logger.error('OAuth state mismatch', { state, storedState, ip: req.ip });
        if (!env.CLIENT_URL) {
            logger.error('CLIENT_URL not configured');
            return res.status(500).json({ message: 'Server configuration error' });
        }
        return res.redirect(`${env.CLIENT_URL}/signin?error=Invalid state parameter`);
    }

    if (!code) {
        logger.error('No authorization code provided in OAuth callback');
        if (!env.CLIENT_URL) {
            logger.error('CLIENT_URL not configured');
            return res.status(500).json({ message: 'Server configuration error' });
        }
        return res.redirect(`${env.CLIENT_URL}/signin?error=Authorization code not provided`);
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        logger.error('Google OAuth not configured - missing credentials');
        if (!env.CLIENT_URL) {
            logger.error('CLIENT_URL not configured');
            return res.status(500).json({ message: 'Server configuration error' });
        }
        return res.redirect(`${env.CLIENT_URL}/signin?error=Google OAuth is not configured`);
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
            logger.error('Failed to get access token from Google', { tokenData });
            if (!env.CLIENT_URL) {
                logger.error('CLIENT_URL not configured');
                return res.status(500).json({ message: 'Server configuration error' });
            }
            return res.redirect(`${env.CLIENT_URL}/signin?error=Failed to get access token from Google`);
        }

        // Get user info from Google
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const googleUser = await userResponse.json();

        if (!googleUser.id) {
            logger.error('Failed to get user info from Google', { googleUser });
            if (!env.CLIENT_URL) {
                logger.error('CLIENT_URL not configured');
                return res.status(500).json({ message: 'Server configuration error' });
            }
            return res.redirect(`${env.CLIENT_URL}/signin?error=Failed to get user info from Google`);
        }

        // Find or create user
        let user = await User.findOne({ email: googleUser.email });

        // Check if user is banned (before creating new user)
        if (user && user.isBanned) {
            if (!env.CLIENT_URL) {
                logger.error('CLIENT_URL not configured');
                return res.status(500).json({ message: 'Server configuration error' });
            }
            return res.redirect(`${env.CLIENT_URL}/signin?error=${encodeURIComponent(`Tài khoản của bạn đã bị cấm. Lý do: ${user.banReason || 'Không có lý do'}`)}`);
        }

        if (!user) {
            // Create new user from Google data
            const nameParts = (googleUser.name || 'User').split(' ');
            const firstName = nameParts[0] || 'User';
            const lastName = nameParts.slice(1).join(' ') || '';
            const username = `google_${googleUser.id}`;

            user = await User.create({
                username,
                email: normalizeEmail(googleUser.email || `${googleUser.id}@google.com`),
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
                    return res.status(500).json({ message: 'Server configuration error' });
                }
                return res.redirect(`${env.CLIENT_URL}/signin?error=${encodeURIComponent('This email is already registered with email/password. Please sign in with your password instead.')}`);
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

        // Generate access token
        const accessToken = jwt.sign(
            { userId: user._id },
            env.ACCESS_TOKEN_SECRET,
            { expiresIn: TOKEN.ACCESS_TOKEN_TTL }
        );

        // Generate refresh token
        const refreshToken = crypto.randomBytes(64).toString("hex");

        // Get device information for Google OAuth
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const ipAddress = getClientIp(req);
        const deviceFingerprint = crypto
            .createHash('sha256')
            .update(`${userAgent}-${ipAddress}`)
            .digest('hex');

        // Check if this is a new device for notification purposes
        const existingSession = await Session.findOne({
            userId: user._id,
            deviceFingerprint,
            expiresAt: { $gt: new Date() },
        });

        // Create new session
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
                logger.error('Failed to create login new device notification:', notifError);
                // Don't fail login if notification fails
            }
        }

        // Set refresh token cookie
        const isProduction = env.NODE_ENV === "production";
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: TOKEN.REFRESH_TOKEN_TTL,
        });

        // Clear OAuth state cookie
        res.clearCookie('oauth_state');

        // Redirect to frontend with token
        if (!env.CLIENT_URL) {
            logger.error('CLIENT_URL not configured');
            return res.status(500).json({ message: 'Server configuration error' });
        }
        logger.info('Google OAuth success - redirecting to frontend with token', { userId: user._id });
        res.redirect(`${env.CLIENT_URL}/auth/google/callback?token=${accessToken}`);
    } catch (error) {
        logger.error('Google OAuth error:', error);
        if (!env.CLIENT_URL) {
            logger.error('CLIENT_URL not configured');
            return res.status(500).json({ message: 'Server configuration error' });
        }
        const errorMessage = error.message || "Failed to authenticate with Google";
        return res.redirect(`${env.CLIENT_URL}/signin?error=${encodeURIComponent(errorMessage)}`);
    }
});

/**
 * Get all active sessions for the current user
 */
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

/**
 * Sign out all devices except the current one
 */
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

/**
 * Sign out a specific session
 */
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
            message: 'Không thể đăng xuất phiên hiện tại. Vui lòng sử dụng nút đăng xuất.',
        });
    }

    // Delete the session
    await Session.deleteOne({ _id: sessionId });

    return res.status(200).json({
        success: true,
        message: 'Đã đăng xuất thiết bị thành công',
    });
});
