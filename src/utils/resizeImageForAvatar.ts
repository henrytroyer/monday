/**
 * resizeImageForAvatar.ts — Compress an image file to a small data-URL avatar.
 */

const MAX_EDGE = 256;
const QUALITY = 0.85;

/** Returns a JPEG/WebP data URL suitable for storing on the operator profile. */
export async function resizeImageForAvatar(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Image is too large (max 8MB).');
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not process image.');
    ctx.drawImage(bitmap, 0, 0, width, height);
    const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(mime, QUALITY);
    if (dataUrl.length > 400_000) {
      // Retry smaller JPEG if still large for Portal Things payload.
      canvas.width = Math.max(1, Math.round(width * 0.7));
      canvas.height = Math.max(1, Math.round(height * 0.7));
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.75);
    }
    return dataUrl;
  } finally {
    bitmap.close();
  }
}
