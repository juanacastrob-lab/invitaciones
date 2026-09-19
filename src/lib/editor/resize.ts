/**
 * Reduce una foto en el navegador antes de subirla: lado máximo y formato.
 * Se intenta WebP; si el navegador no sabe codificarlo (Safari viejo), JPEG.
 * Así la foto llega ya optimizada a Storage y nunca se sube un original de 8 MB.
 */
export async function resizeImage(
  file: File,
  opts: { maxSide: number; format: 'webp' | 'jpeg'; quality?: number },
): Promise<{ blob: Blob; mime: string; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, opts.maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const want = opts.format === 'webp' ? 'image/webp' : 'image/jpeg';
  const quality = opts.quality ?? 0.85;
  let blob = await toBlob(canvas, want, quality);
  if (!blob || blob.type !== want) blob = await toBlob(canvas, 'image/jpeg', quality);
  if (!blob) throw new Error('No se pudo procesar la foto.');
  return { blob, mime: blob.type, width, height };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
