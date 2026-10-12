export const AVATAR_SIZE = 512
export const AVATAR_QUALITY = 0.85

export async function shrinkImage(file, size = AVATAR_SIZE) {
  if (typeof createImageBitmap !== 'function') return file

  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  const side = Math.min(bitmap.width, bitmap.height)
  const target = Math.min(side, size)
  const canvas = document.createElement('canvas')
  canvas.width = target
  canvas.height = target

  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close?.()
    return file
  }

  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    target,
    target,
  )
  bitmap.close?.()

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/webp', AVATAR_QUALITY),
  )
  return blob ?? file
}
