import 'dotenv/config';

/**
 * Validates required environment variables
 */
const validateEnv = () => {
	const required = [
		'MONGODB_URI',
		'ACCESS_TOKEN_SECRET',
		'CLIENT_URL',
	];

	const missing = required.filter(key => !process.env[key]);

	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(', ')}`
		);
	}

	// Validate R2 storage configuration (required)
	const hasR2 = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME);

	if (!hasR2) {
		throw new Error(
			'Missing R2 storage configuration. Please configure:\n' +
			'  - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME'
		);
	}
};

// Validate on import
validateEnv();

export const env = {
	PORT: process.env.PORT || 3000,
	MONGODB_URI: process.env.MONGODB_URI,
	ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
	CLIENT_URL: process.env.CLIENT_URL,
	FRONTEND_URL: process.env.FRONTEND_URL || process.env.CLIENT_URL,
	NODE_ENV: process.env.NODE_ENV || 'development',
	RESEND_API_KEY: process.env.RESEND_API_KEY,
	EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
	EMAIL_FROM: process.env.EMAIL_FROM,
	// Storage Configuration - Cloudflare R2 (required)
	R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
	R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
	R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
	R2_PUBLIC_URL: process.env.R2_PUBLIC_URL, // Optional: Custom domain or R2.dev subdomain
	ARCJET_KEY: process.env.ARCJET_KEY,
	ARCJET_ENV: process.env.ARCJET_ENV,
	GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
	GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
};