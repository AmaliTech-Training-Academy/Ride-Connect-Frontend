export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const UPLOAD_FOLDER = 'rideConnect'

export class ImageUploadError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ImageUploadError'
  }
}

// Read per call rather than at import, so a missing value is reported when
// someone actually tries to upload.
function cloudinaryConfig() {
  return {
    cloudName:
      globalThis.__VITE_CLOUDINARY_CLOUD_NAME__ ||
      globalThis.process?.env?.VITE_CLOUDINARY_CLOUD_NAME ||
      '',
    uploadPreset:
      globalThis.__VITE_CLOUDINARY_UPLOAD_PRESET__ ||
      globalThis.process?.env?.VITE_CLOUDINARY_UPLOAD_PRESET ||
      '',
  }
}

/**
 * Uploads an image straight to Cloudinary through an unsigned preset and
 * returns its HTTPS URL. Goes through `fetch` rather than `apiFetch`: our
 * session cookie and JSON content type must not be sent to Cloudinary.
 *
 * @param {File} file - The picked image
 * @returns {Promise<string>} The uploaded image's secure URL
 */
export async function uploadImage(file) {
  if (!file?.type?.startsWith('image/')) {
    throw new ImageUploadError('Please choose an image file.')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageUploadError('Please choose an image under 5 MB.')
  }

  const { cloudName, uploadPreset } = cloudinaryConfig()
  if (!cloudName || !uploadPreset) {
    throw new ImageUploadError('Picture uploads are not set up yet.')
  }

  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', uploadPreset)
  form.append('folder', UPLOAD_FOLDER)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
    { method: 'POST', body: form },
  )
  const body = await response.json().catch(() => null)

  if (!response.ok || !body?.secure_url) {
    throw new ImageUploadError(
      body?.error?.message || 'Could not upload your picture. Please try again.',
    )
  }

  return body.secure_url
}
