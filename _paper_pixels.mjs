import sharp from 'sharp'
import { readdirSync } from 'node:fs'

const files = readdirSync('/tmp/opencode')
  .filter((f) => f.startsWith('clean-') && f.endsWith('.png'))
  .sort()

console.log('frames:', files.join(', '))

let prev = null
for (const f of files) {
  const { data, info } = await sharp(`/tmp/opencode/${f}`)
    .resize(440, 304, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels: C } = info
  let count = 0
  let minX = W,
    maxX = 0,
    minY = H,
    maxY = 0,
    sumX = 0,
    sumY = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * C
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2]
      // folha clara e neutra-quente; restringe à metade esquerda (impressora)
      const bright = r > 185 && g > 180 && b > 160 && r - b < 60 && x < W * 0.62
      if (bright) {
        count++
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        sumX += x
        sumY += y
      }
    }
  }
  let diff = 0
  if (prev) {
    for (let i = 0; i < data.length; i += C) {
      if (
        Math.abs(data[i] - prev[i]) + Math.abs(data[i + 1] - prev[i + 1]) + Math.abs(data[i + 2] - prev[i + 2]) >
        60
      )
        diff++
    }
  }
  prev = data
  const cx = count ? (sumX / count).toFixed(0) : '-'
  const cy = count ? (sumY / count).toFixed(0) : '-'
  console.log(
    f.padEnd(24),
    'bright px',
    String(count).padStart(6),
    'centroid',
    `${cx},${cy}`,
    'bbox',
    count ? `[x ${minX}-${maxX} y ${minY}-${maxY}]` : '-',
    'diffPrev',
    diff,
  )
}
