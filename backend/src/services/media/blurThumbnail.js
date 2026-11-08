import sharp from 'sharp';

/** Preserve aspect ratio and existing PNG encoding for all upload formats. */
export async function createBlurThumbnail(buffer) {
  const png = await sharp(buffer)
    .resize(20, 20, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, quality: 80 })
    .toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}
