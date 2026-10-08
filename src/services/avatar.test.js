import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import { MAX_AVATAR_BYTES, uploadAvatar } from './avatar'

const API = 'https://52.213.178.166.nip.io'
const BUCKET = 'https://bucket.s3.eu-west-1.amazonaws.com/'
const KEY = 'avatars/u1/abc.png'
const IMAGE = `${BUCKET}${KEY}`

function imageFile({ type = 'image/png', size = 1024 } = {}) {
  const file = new File(['x'], 'me.png', { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

function json(status, body) {
  return { ok: status < 400, status, json: async () => body }
}

function s3(status, text = '') {
  return { ok: status < 400, status, text: async () => text }
}

const signedForm = {
  url: BUCKET,
  fields: { 'Content-Type': 'image/png', key: KEY, Policy: 'p' },
  key: KEY,
  maxBytes: MAX_AVATAR_BYTES,
  expiresIn: 300,
}

describe('uploadAvatar', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn()
  })

  afterEach(() => {
    delete globalThis.fetch
    delete globalThis.createImageBitmap
    jest.restoreAllMocks()
  })

  it('signs a form, uploads to S3, saves the key and returns the image URL', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(json(201, { success: true, data: signedForm }))
      .mockResolvedValueOnce(s3(204))
      .mockResolvedValueOnce(
        json(200, { success: true, data: { image: IMAGE } }),
      )
    const file = imageFile()

    await expect(uploadAvatar(file)).resolves.toBe(IMAGE)

    const [signUrl, signOptions] = globalThis.fetch.mock.calls[0]
    expect(signUrl).toBe(`${API}/api/users/me/avatar/upload`)
    expect(signOptions.method).toBe('POST')
    expect(signOptions.credentials).toBe('include')
    expect(JSON.parse(signOptions.body)).toEqual({ contentType: 'image/png' })

    const [s3Url, s3Options] = globalThis.fetch.mock.calls[1]
    expect(s3Url).toBe(BUCKET)
    expect(s3Options.method).toBe('POST')
    expect(s3Options.credentials).toBeUndefined()
    expect(s3Options.headers).toBeUndefined()
    expect([...s3Options.body.keys()]).toEqual([
      'Content-Type',
      'key',
      'Policy',
      'file',
    ])
    expect(s3Options.body.get('file')).toBe(file)

    const [saveUrl, saveOptions] = globalThis.fetch.mock.calls[2]
    expect(saveUrl).toBe(`${API}/api/users/me/avatar`)
    expect(saveOptions.method).toBe('PUT')
    expect(saveOptions.credentials).toBe('include')
    expect(JSON.parse(saveOptions.body)).toEqual({ key: KEY })
  })

  it('uploads the shrunk image under its own type', async () => {
    const webp = new Blob(['y'], { type: 'image/webp' })
    globalThis.createImageBitmap = jest
      .fn()
      .mockResolvedValue({ width: 4000, height: 3000, close: jest.fn() })
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => ({ drawImage: jest.fn() }))
    jest
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((callback) => callback(webp))
    globalThis.fetch
      .mockResolvedValueOnce(json(201, { data: signedForm }))
      .mockResolvedValueOnce(s3(204))
      .mockResolvedValueOnce(json(200, { data: { image: IMAGE } }))
    const file = imageFile({ type: 'image/jpeg', size: MAX_AVATAR_BYTES })

    await expect(uploadAvatar(file)).resolves.toBe(IMAGE)

    expect(globalThis.createImageBitmap).toHaveBeenCalledWith(file)
    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body)).toEqual({
      contentType: 'image/webp',
    })
    expect(globalThis.fetch.mock.calls[1][1].body.get('file')).toBeInstanceOf(
      Blob,
    )
    expect(globalThis.fetch.mock.calls[1][1].body.get('file').type).toBe(
      'image/webp',
    )
  })

  it('rejects a file that is not an image without uploading', async () => {
    await expect(
      uploadAvatar(imageFile({ type: 'application/pdf' })),
    ).rejects.toThrow('Please choose an image file.')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('rejects an image it could not convert to a supported type', async () => {
    await expect(
      uploadAvatar(imageFile({ type: 'image/gif' })),
    ).rejects.toThrow('Please choose a JPEG, PNG or WebP image.')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('rejects an original over the size limit before decoding it', async () => {
    globalThis.createImageBitmap = jest.fn()

    await expect(
      uploadAvatar(imageFile({ size: MAX_AVATAR_BYTES + 1 })),
    ).rejects.toThrow('Please choose an image under 5 MB.')
    expect(globalThis.createImageBitmap).not.toHaveBeenCalled()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('rejects a shrunk image still over the size limit without uploading', async () => {
    const webp = new Blob(['y'], { type: 'image/webp' })
    Object.defineProperty(webp, 'size', { value: MAX_AVATAR_BYTES + 1 })
    globalThis.createImageBitmap = jest
      .fn()
      .mockResolvedValue({ width: 512, height: 512, close: jest.fn() })
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => ({ drawImage: jest.fn() }))
    jest
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((callback) => callback(webp))

    await expect(uploadAvatar(imageFile())).rejects.toThrow(
      'Please choose an image under 5 MB.',
    )
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it("shows the API's content type message when signing is refused", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      json(400, {
        success: false,
        message: 'Validation failed',
        data: { fields: { contentType: 'Unsupported image type' } },
      }),
    )

    await expect(uploadAvatar(imageFile())).rejects.toThrow(
      'Unsupported image type',
    )
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('explains an image S3 finds too large', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(json(201, { data: signedForm }))
      .mockResolvedValueOnce(
        s3(400, '<Error><Code>EntityTooLarge</Code></Error>'),
      )

    await expect(uploadAvatar(imageFile())).rejects.toThrow(
      'Please choose an image under 5 MB.',
    )
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })

  it('asks to try again when S3 refuses the form', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(json(201, { data: signedForm }))
      .mockResolvedValueOnce(
        s3(403, '<Error><Code>AccessDenied</Code></Error>'),
      )

    await expect(uploadAvatar(imageFile())).rejects.toThrow(
      'Could not update your picture. Please try again.',
    )
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })

  it('asks to try again when the S3 request never completes', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(json(201, { data: signedForm }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(uploadAvatar(imageFile())).rejects.toThrow(
      'Could not update your picture. Please try again.',
    )
  })

  it("shows the API's message when saving the key fails", async () => {
    globalThis.fetch
      .mockResolvedValueOnce(json(201, { data: signedForm }))
      .mockResolvedValueOnce(s3(204))
      .mockResolvedValueOnce(
        json(400, { success: false, message: 'No file uploaded for this key' }),
      )

    await expect(uploadAvatar(imageFile())).rejects.toThrow(
      'No file uploaded for this key',
    )
  })

  it('falls back to a generic message on a non-JSON API failure', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('not json')
      },
    })

    await expect(uploadAvatar(imageFile())).rejects.toThrow(
      'Could not update your picture. Please try again.',
    )
  })
})
