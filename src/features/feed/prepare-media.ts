import { validateMediaFile } from '../../data/article-validation'

export async function prepareMedia(file: File): Promise<{ file: File; width?: number; height?: number }> {
  validateMediaFile(file)
  if (file.type.startsWith('video/')) {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    const valid = file.type === 'video/mp4'
      ? String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp'
      : bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
    if (!valid) throw new Error('This video could not be read. Export it as MP4 or WebM and try again.')
    return { file }
  }
  const image = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image processing is unavailable. Try another browser.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Could not prepare image')), 'image/webp', .85))
    return { file: new File([blob], 'photo.webp', { type: blob.type }), width: canvas.width, height: canvas.height }
  } finally { image.close() }
}
