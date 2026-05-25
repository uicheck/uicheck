import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

interface ScreenshotLike {
  width?: number
  height?: number
  mimeType: string
  base64: string
}

export interface ImageCompareResult {
  width: number
  height: number
  mismatchedPixels: number
  totalPixels: number
  mismatchRatio: number
  passed: boolean
  diffBase64: string
}

export interface ImageCompareOptions {
  threshold?: number
}

export function comparePngScreenshots(
  actualScreenshot: ScreenshotLike,
  expectedImageBase64: string,
  options: ImageCompareOptions = {}
): ImageCompareResult {
  assertPng(actualScreenshot.mimeType)
  const actual = PNG.sync.read(Buffer.from(stripDataUrl(actualScreenshot.base64), 'base64'))
  const expected = PNG.sync.read(Buffer.from(stripDataUrl(expectedImageBase64), 'base64'))
  if (actual.width !== expected.width || actual.height !== expected.height) {
    throw new Error(`Screenshot dimensions differ: actual ${actual.width}x${actual.height}, expected ${expected.width}x${expected.height}`)
  }

  const diff = new PNG({ width: actual.width, height: actual.height })
  const mismatchedPixels = pixelmatch(actual.data, expected.data, diff.data, actual.width, actual.height, {
    threshold: options.threshold ?? 0.1
  })
  const totalPixels = actual.width * actual.height

  return {
    width: actual.width,
    height: actual.height,
    mismatchedPixels,
    totalPixels,
    mismatchRatio: totalPixels > 0 ? mismatchedPixels / totalPixels : 0,
    passed: mismatchedPixels === 0,
    diffBase64: PNG.sync.write(diff).toString('base64')
  }
}

function assertPng(mimeType: string): void {
  if (mimeType !== 'image/png') throw new Error(`Only image/png screenshots can be compared, received ${mimeType}`)
}

function stripDataUrl(value: string): string {
  return value.includes(',') ? value.slice(value.indexOf(',') + 1) : value
}
