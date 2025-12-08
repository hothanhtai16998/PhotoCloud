import { asyncHandler } from '../middlewares/asyncHandler.js';
import { extractIdFromSlug, findImageByShortId } from '../utils/slugUtils.js';
import { logger } from '../utils/logger.js';
import { env } from '../libs/env.js';

/**
 * Check if the request is from a social media scraper
 * @param {Object} req - Express request object
 * @returns {boolean} - True if request is from a social media scraper
 */
function isSocialMediaScraper(req) {
  const userAgent = req.get('user-agent') || '';
  const lowerUA = userAgent.toLowerCase();

  // Log user agent for debugging (debug-level to reduce noise)
  if (logger.debug) logger.debug(`Checking user agent: ${userAgent}`);

  // Facebook crawler - most common patterns
  if (lowerUA.includes('facebookexternalhit') ||
    lowerUA.includes('facebot') ||
    lowerUA.includes('facebookcatalog') ||
    lowerUA.includes('facebookplatform')) {
    if (logger.debug) logger.debug('Detected Facebook scraper');
    return true;
  }

  // Twitter crawler
  if (lowerUA.includes('twitterbot') ||
    lowerUA.includes('twitter') ||
    lowerUA.includes('x.com')) {
    if (logger.debug) logger.debug('Detected Twitter scraper');
    return true;
  }

  // LinkedIn crawler
  if (lowerUA.includes('linkedinbot')) {
    if (logger.debug) logger.debug('Detected LinkedIn scraper');
    return true;
  }

  // Pinterest crawler
  if (lowerUA.includes('pinterest')) {
    if (logger.debug) logger.debug('Detected Pinterest scraper');
    return true;
  }

  // WhatsApp crawler
  if (lowerUA.includes('whatsapp')) {
    if (logger.debug) logger.debug('Detected WhatsApp scraper');
    return true;
  }

  // Telegram crawler
  if (lowerUA.includes('telegrambot')) {
    if (logger.debug) logger.debug('Detected Telegram scraper');
    return true;
  }

  // Discord crawler
  if (lowerUA.includes('discordbot')) {
    if (logger.debug) logger.debug('Detected Discord scraper');
    return true;
  }

  return false;
}

/**
 * Generate HTML with meta tags for social sharing
 * @param {Object} image - Image document
 * @param {string} url - Full URL of the page
 * @returns {string} - HTML string with meta tags
 */
function generateSocialShareHTML(image, url, req) {
  // Get image URL - prefer regularUrl, fallback to smallUrl, then imageUrl
  let imageUrl = image.regularUrl || image.smallUrl || image.imageUrl;

  // Ensure image URL is absolute (Facebook requires absolute URLs)
  if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    // If relative URL, make it absolute
    const protocol = req.protocol || (req.secure ? 'https' : 'http');
    const host = req.get('host');
    imageUrl = `${protocol}://${host}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
  }

  // Log the final image URL for debugging (debug-level to reduce noise)
  if (logger.debug) logger.debug(`Final image URL for meta tags: ${imageUrl}`);

  const title = image.imageTitle || 'Photo';
  const authorName = image.uploadedBy?.displayName || image.uploadedBy?.username || 'Unknown';
  const description = `Photo by ${authorName}${image.location ? ` in ${image.location}` : ''}`;
  const siteName = 'PhotoApp';

  // Derive image mime type from file extension if possible
  let imageType = '';
  try {
    const ext = (imageUrl || '').split('.').pop().toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') imageType = 'image/jpeg';
    else if (ext === 'png') imageType = 'image/png';
    else if (ext === 'webp') imageType = 'image/webp';
    else if (ext === 'gif') imageType = 'image/gif';
    else if (ext === 'svg') imageType = 'image/svg+xml';
  } catch (e) {
    imageType = '';
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - ${siteName}</title>
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
  ${imageType ? `<meta property="og:image:type" content="${escapeHtml(imageType)}">` : ''}
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="${siteName}">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${escapeHtml(url)}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  
  <!-- Additional meta tags -->
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Redirect to actual page for non-scrapers -->
  <script>
    // Redirect to the actual page
    window.location.href = "${escapeHtml(url)}";
  </script>
</head>
<body>
  <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" style="max-width: 100%; height: auto;">
    <p><a href="${escapeHtml(url)}">View on PhotoApp</a></p>
  </div>
</body>
</html>`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Handle social media sharing requests
 * Serves HTML with proper meta tags for social media scrapers
 */
export const handleSocialShare = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  if (!slug) {
    return res.status(404).send('Not found');
  }

  // Extract short ID from slug
  const shortId = extractIdFromSlug(slug);
  if (!shortId) {
    logger.warn(`Invalid slug format: ${slug}`);
    return res.status(404).send('Invalid image slug');
  }

  // Find image by short ID
  const image = await findImageByShortId(shortId);
  if (!image) {
    logger.warn(`Image not found for short ID: ${shortId}`);
    return res.status(404).send('Image not found');
  }

  // Build full URL
  const protocol = req.protocol || (req.secure ? 'https' : 'http');
  const host = req.get('host');
  const fullUrl = `${protocol}://${host}${req.originalUrl}`;

  // Log a concise summary for debugging
  if (logger.debug) {
    logger.debug(`Social share request: ua=${req.get('user-agent')}, id=${image._id}, url=${image.regularUrl || image.smallUrl || image.imageUrl}, fullUrl=${fullUrl}`);
  } else {
    logger.info(`Social share for image ${image._id}`);
  }

  // Generate HTML with meta tags
  const html = generateSocialShareHTML(image, fullUrl, req);

  // Set appropriate headers
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

  // Allow Facebook and other scrapers to access
  res.set('X-Content-Type-Options', 'nosniff');

  // Send response
  res.send(html);
});

/**
 * Middleware to check if request is from social media scraper
 * If not, pass to next middleware (SPA fallback)
 */
export const checkSocialScraper = asyncHandler(async (req, res, next) => {
  if (isSocialMediaScraper(req)) {
    // Handle as social share request
    return await handleSocialShare(req, res, next);
  }
  // Not a scraper, continue to SPA
  next();
});

