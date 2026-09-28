import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import {
  DEFAULT_CLOUD_NAME,
  DEFAULT_UPLOAD_PRESET,
  MAX_IMAGE_BYTES,
  uploadImage,
} from './cloudinary'

function imageFile({ type = 'image/png', size = 1024 } = {}) {
  const file = new File(['x'], 'me.png', { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('uploadImage', () => {
  beforeEach(() => {
    globalThis.__VITE_CLOUDINARY_CLOUD_NAME__ = 'demo-cloud'
    globalThis.__VITE_CLOUDINARY_UPLOAD_PRESET__ = 'rideconnect-avatars'
    globalThis.fetch = jest.fn()
  })

  afterEach(() => {
    delete globalThis.__VITE_CLOUDINARY_CLOUD_NAME__
    delete globalThis.__VITE_CLOUDINARY_UPLOAD_PRESET__
    delete globalThis.fetch
  })

  it('posts the file with the unsigned preset and returns the secure URL', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ secure_url: 'https://res.cloudinary.com/x/me.png' }),
    })
    const file = imageFile()

    await expect(uploadImage(file)).resolves.toBe(
      'https://res.cloudinary.com/x/me.png',
    )

    const [url, options] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('https://api.cloudinary.com/v1_1/demo-cloud/image/upload')
    expect(options.method).toBe('POST')
    expect(options.body.get('file')).toBe(file)
    expect(options.body.get('upload_preset')).toBe('rideconnect-avatars')
    expect(options.body.get('folder')).toBe('rideConnect')
    // The session cookie must never go to Cloudinary.
    expect(options.credentials).toBeUndefined()
  })

  it('rejects a file that is not an image without uploading', async () => {
    await expect(
      uploadImage(imageFile({ type: 'application/pdf' })),
    ).rejects.toThrow('Please choose an image file.')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('rejects an image over the size limit without uploading', async () => {
    await expect(
      uploadImage(imageFile({ size: MAX_IMAGE_BYTES + 1 })),
    ).rejects.toThrow('Please choose an image under 5 MB.')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('uses the built-in account and preset when nothing is configured', async () => {
    delete globalThis.__VITE_CLOUDINARY_CLOUD_NAME__
    delete globalThis.__VITE_CLOUDINARY_UPLOAD_PRESET__
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ secure_url: 'https://res.cloudinary.com/x/me.png' }),
    })

    await uploadImage(imageFile())

    const [url, options] = globalThis.fetch.mock.calls[0]
    expect(url).toBe(
      `https://api.cloudinary.com/v1_1/${DEFAULT_CLOUD_NAME}/image/upload`,
    )
    expect(options.body.get('upload_preset')).toBe(DEFAULT_UPLOAD_PRESET)
  })

  it("surfaces Cloudinary's own error message", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Upload preset not found' } }),
    })

    await expect(uploadImage(imageFile())).rejects.toThrow(
      'Upload preset not found',
    )
  })

  it('falls back to a generic message on a non-JSON failure', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error('not json')
      },
    })

    await expect(uploadImage(imageFile())).rejects.toThrow(
      'Could not upload your picture. Please try again.',
    )
  })
})
