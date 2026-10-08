import { apiFetch } from '../lib/api'

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const GENERIC_MESSAGE = 'Could not update your picture. Please try again.'

export class AvatarUploadError extends Error {
  constructor(message = GENERIC_MESSAGE) {
    super(message)
    this.name = 'AvatarUploadError'
  }
}

async function apiData(path, options) {
  const response = await apiFetch(path, options)
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new AvatarUploadError(
      body?.data?.fields?.contentType || body?.message || GENERIC_MESSAGE,
    )
  }

  return body?.data
}

async function sendToS3({ url, fields }, file) {
  const form = new FormData()
  Object.entries(fields).forEach(([name, value]) => form.append(name, value))
  form.append('file', file)

  let response
  try {
    response = await fetch(url, { method: 'POST', body: form })
  } catch {
    throw new AvatarUploadError()
  }

  if (response.status === 204) return

  const text = await response.text().catch(() => '')
  if (text.includes('EntityTooLarge')) {
    throw new AvatarUploadError('Please choose an image under 5 MB.')
  }
  throw new AvatarUploadError()
}

export async function uploadAvatar(file) {
  if (!AVATAR_TYPES.includes(file?.type)) {
    throw new AvatarUploadError('Please choose a JPEG, PNG or WebP image.')
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new AvatarUploadError('Please choose an image under 5 MB.')
  }

  const upload = await apiData('/api/users/me/avatar/upload', {
    method: 'POST',
    body: JSON.stringify({ contentType: file.type }),
  })

  await sendToS3(upload, file)

  const { image } = await apiData('/api/users/me/avatar', {
    method: 'PUT',
    body: JSON.stringify({ key: upload.key }),
  })

  return image
}
