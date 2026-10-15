/**
 * Helper to generate a valid password reset token for testing.
 * Usage: node scripts/test-reset-token.js <userId>
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import PasswordResetToken from '../src/models/PasswordResetToken.js';
import User from '../src/models/User.js';

async function main() {
    const userId = process.argv[2];
    if (!userId) {
        console.error('Usage: node scripts/test-reset-token.js <userId|email>');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);

    // Lookup user by id or email
    const isObjectId = mongoose.isValidObjectId(userId);
    const user = isObjectId
        ? await User.findById(userId)
        : await User.findOne({ email: userId.toLowerCase() });

    if (!user) {
        console.error('User not found');
        process.exit(1);
    }

    // Use the model's createToken helper to ensure correct format
    const rawToken = await PasswordResetToken.createToken(
        user._id,
        user.email,
        null,
        'test-script'
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;

    console.log('User:', user.email);
    console.log('Reset URL:');
    console.log(resetUrl);

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
