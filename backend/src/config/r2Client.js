import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env.js';

// Initialize R2 storage client
// R2 is S3-compatible, so we use the AWS S3 SDK
const r2Client = new S3Client({
  region: 'auto', // R2 uses 'auto' as region
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Required for R2
});

export { r2Client };
export default r2Client;
