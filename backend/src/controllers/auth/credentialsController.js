import {
  normalizeAccountIdentifier as normalizeEmail,
  normalizeAccountIdentifier as normalizeUsername,
} from '../../utils/accountIdentifier.js';
import { createLoginSession } from '../../services/auth/loginSession.js';
import bcrypt from 'bcrypt';
import User from '../../models/User.js';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { TOKEN } from '../../utils/constants.js';
import { getClientIp } from '../../services/audit/auditLogger.js';

// Helpers

export const checkEmailAvailability = asyncHandler(async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: 'Email không được để trống' });
  }

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    if (existingUser.isOAuthUser) {
      return res.status(409).json({
        available: false,
        message:
          'Email này đã đăng ký với tài khoản Google, xin vui lòng đăng nhập bằng Google.',
      });
    }
    return res.status(409).json({
      available: false,
      message: 'Email đã tồn tại',
    });
  }

  return res.status(200).json({ available: true });
});

export const checkUsernameAvailability = asyncHandler(async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ message: 'Username không được để trống' });
  }

  const normalizedUsername = normalizeUsername(username);
  const existingUser = await User.findOne({ username: normalizedUsername });

  if (existingUser) {
    return res.status(409).json({
      available: false,
      message: 'Tên tài khoản đã tồn tại',
    });
  }

  return res.status(200).json({ available: true });
});

export const signUp = asyncHandler(async (req, res) => {
  const { username, password, email, firstName, lastName, phone, bio } =
    req.body;

  // Note: Input validation is handled by validationMiddleware
  // This is just for data extraction

  // Validate password is provided for regular signup
  if (!password) {
    return res.status(400).json({ message: 'Mật khẩu không được để trống' });
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
    if (
      existingUser.username &&
      normalizedUsername &&
      normalizeUsername(existingUser.username) === normalizedUsername
    ) {
      return res.status(409).json({ message: 'Tên tài khoản đã tồn tại' });
    }
    if (
      existingUser.email &&
      normalizedEmail &&
      normalizeEmail(existingUser.email) === normalizedEmail
    ) {
      if (existingUser.isOAuthUser) {
        return res.status(409).json({
          message:
            'Email này đã đăng ký với tài khoản Google, xin vui lòng đăng nhập bằng Google.',
        });
      }
      return res.status(409).json({ message: 'Email đã tồn tại' });
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Build displayName safely
  const safeFirst = (firstName || '').toString().trim();
  const safeLast = (lastName || '').toString().trim();
  const displayName =
    `${safeFirst} ${safeLast}`.trim() || normalizedUsername || undefined;

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
    message: 'Tạo tài khoản thành công',
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
      message: 'Tên tài khoản hoặc mật khẩu không đúng',
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
      message:
        'Tài khoản này được tạo bằng cách đăng nhập với tài khoản Google. Vui lòng đăng nhập bằng tài khoản Google.',
    });
  }

  // Verify password
  if (!user.hashedPassword) {
    return res.status(401).json({
      message: 'Tên tài khoản hoặc mật khẩu không đúng',
    });
  }

  const isPasswordMatch = await bcrypt.compare(password, user.hashedPassword);

  if (!isPasswordMatch) {
    return res.status(401).json({
      message: 'Tên tài khoản hoặc mật khẩu không đúng',
    });
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

  // Compute admin status from AdminRole (single source of truth)
  const { enrichUserWithAdminStatus } =
    await import('../../services/permissions/adminUtils.js');
  const enrichedUser = await enrichUserWithAdminStatus(
    user.toObject ? user.toObject() : user
  );

  return res.status(200).json({
    message: 'Đăng nhập thành công',
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
