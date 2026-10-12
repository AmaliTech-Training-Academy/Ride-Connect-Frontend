import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import { AVATAR_QUALITY, shrinkImage } from './shrinkImage'

function bitmap(width, height) {
  return { width, height, close: jest.fn() }
}

describe('shrinkImage', () => {
  let context
  let toBlob
  const file = new File(['x'], 'me.jpg', { type: 'image/jpeg' })
  const webp = new Blob(['y'], { type: 'image/webp' })

  beforeEach(() => {
    context = { drawImage: jest.fn() }
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => context)
    toBlob = jest
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((callback) => callback(webp))
  })

  afterEach(() => {
    delete globalThis.createImageBitmap
    jest.restoreAllMocks()
  })

  it('crops a landscape photo to its centre square and scales it down to WebP', async () => {
    const source = bitmap(4000, 3000)
    globalThis.createImageBitmap = jest.fn().mockResolvedValue(source)

    await expect(shrinkImage(file)).resolves.toBe(webp)

    expect(globalThis.createImageBitmap).toHaveBeenCalledWith(file)
    expect(context.drawImage).toHaveBeenCalledWith(
      source,
      500,
      0,
      3000,
      3000,
      0,
      0,
      512,
      512,
    )
    expect(toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/webp',
      AVATAR_QUALITY,
    )
    expect(source.close).toHaveBeenCalled()
  })

  it('crops a portrait photo from the middle', async () => {
    globalThis.createImageBitmap = jest
      .fn()
      .mockResolvedValue(bitmap(1000, 1600))

    await shrinkImage(file)

    expect(context.drawImage.mock.calls[0].slice(1)).toEqual([
      0, 300, 1000, 1000, 0, 0, 512, 512,
    ])
  })

  it('never scales a small image up', async () => {
    globalThis.createImageBitmap = jest.fn().mockResolvedValue(bitmap(200, 300))

    await shrinkImage(file)

    expect(context.drawImage.mock.calls[0].slice(5)).toEqual([0, 0, 200, 200])
  })

  it('keeps the original when the browser cannot decode it', async () => {
    globalThis.createImageBitmap = jest
      .fn()
      .mockRejectedValue(new Error('unsupported'))

    await expect(shrinkImage(file)).resolves.toBe(file)
  })

  it('keeps the original when the browser has no image decoding', async () => {
    await expect(shrinkImage(file)).resolves.toBe(file)
  })

  it('keeps the original when the canvas has no 2D context', async () => {
    const source = bitmap(800, 800)
    globalThis.createImageBitmap = jest.fn().mockResolvedValue(source)
    HTMLCanvasElement.prototype.getContext.mockImplementation(() => null)

    await expect(shrinkImage(file)).resolves.toBe(file)
    expect(source.close).toHaveBeenCalled()
  })

  it('keeps the original when the canvas cannot be encoded', async () => {
    globalThis.createImageBitmap = jest.fn().mockResolvedValue(bitmap(800, 800))
    toBlob.mockImplementation((callback) => callback(null))

    await expect(shrinkImage(file)).resolves.toBe(file)
  })
})
