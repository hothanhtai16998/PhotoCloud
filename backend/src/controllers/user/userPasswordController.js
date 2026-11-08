import { asyncHandler } from "../../middlewares/asyncHandler.js";
import bcrypt from "bcrypt";
import User from "../../models/User.js";
import Notification from "../../models/Notification.js";
import { getPasswordRequirements } from '../../services/auth/passwordRequirements.js';
import { logger } from '../../utils/logger.js';

export const changePassword = asyncHandler(async (req, res) => {
    const { password, newPassword, newPasswordMatch } = req.body;
    const userId = req.user._id;

    if (!password || !newPassword || !newPasswordMatch) {
        return res.status(400).json({
            message: "Password fields cannot be empty",
        });
    }

    const passwordRequirements = await getPasswordRequirements();

    // Validate password length
    if (newPassword.length < passwordRequirements.minLength) {
        return res.status(400).json({
            message: `Máº­t kháº©u pháº£i cÃ³ Ã­t nháº¥t ${passwordRequirements.minLength} kÃ½ tá»±`,
        });
    }

    // Validate password complexity
    const regexParts = [];
    if (passwordRequirements.requireLowercase) regexParts.push('(?=.*[a-z])');
    if (passwordRequirements.requireUppercase) regexParts.push('(?=.*[A-Z])');
    if (passwordRequirements.requireNumber) regexParts.push('(?=.*\\d)');
    if (passwordRequirements.requireSpecialChar) regexParts.push('(?=.*[^a-zA-Z0-9])');

    if (regexParts.length > 0) {
        const passwordRegex = new RegExp(`^${regexParts.join('')}.{${passwordRequirements.minLength},}$`);
        if (!passwordRegex.test(newPassword)) {
            const messageParts = [];
            if (passwordRequirements.requireLowercase) messageParts.push('chá»¯ thÆ°á»ng');
            if (passwordRequirements.requireUppercase) messageParts.push('chá»¯ hoa');
            if (passwordRequirements.requireNumber) messageParts.push('sá»‘');
            if (passwordRequirements.requireSpecialChar) messageParts.push('kÃ½ tá»± Ä‘áº·c biá»‡t');
            return res.status(400).json({
                message: `Máº­t kháº©u pháº£i cÃ³ ${messageParts.join(', ')}`,
            });
        }
    }

    if (newPassword !== newPasswordMatch) {
        return res.status(400).json({
            message: "New passwords do not match",
        });
    }

    // Fetch user with hashedPassword
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isPasswordMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!isPasswordMatch) {
        return res.status(401).json({
            message: "Current password is incorrect",
        });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await User.findByIdAndUpdate(userId, { hashedPassword });

    // Create notification
    try {
        await Notification.create({
            recipient: userId,
            type: 'password_changed',
            metadata: {
                timestamp: new Date().toISOString(),
                ipAddress: req.ip || req.headers['x-forwarded-for'] || 'Unknown',
            },
        });
    } catch (notifError) {
        logger.error('Failed to create password changed notification', { userId });
    }

    return res.status(200).json({
        message: "Password changed successfully",
    });
});

export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'Email lÃ  báº¯t buá»™c.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Always return 200 to prevent email enumeration â€” same response whether user exists or not.
    const user = await User.findOne({ email: normalizedEmail }).select('_id email username');

    if (user) {
        try {
            const PasswordResetToken = (await import('../../models/PasswordResetToken.js')).default;
            const token = await PasswordResetToken.createToken(
                user._id,
                user.email,
                req.ip || req.connection?.remoteAddress,
                req.get('user-agent')
            );

            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

            const { sendUserEmail } = await import('../../services/email/emailAlerts.js');
            await sendUserEmail(
                user.email,
                'Äáº·t láº¡i máº­t kháº©u PhotoCloud',
                `<p>Xin chÃ o ${user.username || user.email},</p>
                 <p>Báº¡n Ä‘Ã£ yÃªu cáº§u Ä‘áº·t láº¡i máº­t kháº©u cho tÃ i khoáº£n PhotoCloud.</p>
                 <p>Nháº¥n vÃ o link bÃªn dÆ°á»›i Ä‘á»ƒ Ä‘áº·t láº¡i máº­t kháº©u (link cÃ³ hiá»‡u lá»±c trong 1 giá»):</p>
                 <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#B8865B;color:#fff;text-decoration:none;border-radius:6px;">Äáº·t láº¡i máº­t kháº©u</a></p>
                 <p>Náº¿u báº¡n khÃ´ng yÃªu cáº§u Ä‘áº·t láº¡i máº­t kháº©u, hÃ£y bá» qua email nÃ y.</p>
                 <p>â€” Äá»™i ngÅ© PhotoCloud</p>`,
                `Xin chÃ o ${user.username || user.email},\n\nBáº¡n Ä‘Ã£ yÃªu cáº§u Ä‘áº·t láº¡i máº­t kháº©u. Truy cáº­p: ${resetUrl}\nLink cÃ³ hiá»‡u lá»±c trong 1 giá».\nNáº¿u khÃ´ng pháº£i báº¡n, bá» qua email nÃ y.\nâ€” PhotoCloud`
            );
        } catch (emailError) {
            // Log but don't expose email failure to client
            console.error('Failed to send reset email:', emailError);
        }
    }

    // Always return success to prevent email enumeration
    return res.status(200).json({
        message: 'Náº¿u email tá»“n táº¡i trong há»‡ thá»‘ng, chÃºng tÃ´i Ä‘Ã£ gá»­i link Ä‘áº·t láº¡i máº­t kháº©u.',
    });
});

export const resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: 'Token lÃ  báº¯t buá»™c.' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ message: 'Máº­t kháº©u pháº£i cÃ³ Ã­t nháº¥t 8 kÃ½ tá»±.' });
    }

    const PasswordResetToken = (await import('../../models/PasswordResetToken.js')).default;
    const resetToken = await PasswordResetToken.findByToken(token);

    if (!resetToken) {
        return res.status(400).json({ message: 'Link Ä‘áº·t láº¡i máº­t kháº©u khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n.' });
    }

    const user = resetToken.userId;
    if (!user || !user._id) {
        return res.status(400).json({ message: 'Token khÃ´ng há»£p lá»‡.' });
    }

    // OAuth users don't have local passwords â€” they can't reset.
    if (user.isOAuthUser) {
        return res.status(400).json({
            message: 'TÃ i khoáº£n nÃ y Ä‘Äƒng nháº­p qua Google. Vui lÃ²ng Ä‘Äƒng nháº­p báº±ng Google Ä‘á»ƒ Ä‘áº·t láº¡i máº­t kháº©u.',
        });
    }

    // Hash new password
    const bcrypt = await import('bcrypt');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password
    user.hashedPassword = hashedPassword;
    await user.save();

    // Consume token (mark as used)
    await PasswordResetToken.consumeToken(resetToken._id);

    return res.status(200).json({ message: 'Máº­t kháº©u Ä‘Ã£ Ä‘Æ°á»£c Ä‘áº·t láº¡i thÃ nh cÃ´ng. Báº¡n cÃ³ thá»ƒ Ä‘Äƒng nháº­p ngay.' });
});
