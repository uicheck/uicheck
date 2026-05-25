import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'
import { comparePngScreenshots } from './image-compare'

describe('comparePngScreenshots', () => {
  it('passes when PNG screenshots are identical', () => {
    const image = createPngBase64(2, 1, [
      [255, 0, 0, 255],
      [0, 255, 0, 255]
    ])

    expect(comparePngScreenshots({ mimeType: 'image/png', base64: image }, image)).toMatchObject({
      width: 2,
      height: 1,
      mismatchedPixels: 0,
      totalPixels: 2,
      mismatchRatio: 0,
      passed: true
    })
  })

  it('returns mismatch metrics and a diff image', () => {
    const actual = createPngBase64(2, 1, [
      [255, 0, 0, 255],
      [0, 255, 0, 255]
    ])
    const expected = createPngBase64(2, 1, [
      [255, 0, 0, 255],
      [0, 0, 255, 255]
    ])

    const result = comparePngScreenshots({ mimeType: 'image/png', base64: actual }, expected, { threshold: 0 })

    expect(result).toMatchObject({
      width: 2,
      height: 1,
      mismatchedPixels: 1,
      totalPixels: 2,
      mismatchRatio: 0.5,
      passed: false
    })
    expect(result.diffBase64.length).toBeGreaterThan(0)
  })

  it('rejects images with different dimensions', () => {
    const actual = createPngBase64(1, 1, [[255, 0, 0, 255]])
    const expected = createPngBase64(2, 1, [
      [255, 0, 0, 255],
      [255, 0, 0, 255]
    ])

    expect(() => comparePngScreenshots({ mimeType: 'image/png', base64: actual }, expected)).toThrow('Screenshot dimensions differ')
  })
})

function createPngBase64(width: number, height: number, pixels: Array<[number, number, number, number]>): string {
  const image = new PNG({ width, height })
  pixels.forEach((pixel, index) => image.data.set(pixel, index * 4))
  return PNG.sync.write(image).toString('base64')
}
