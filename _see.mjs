import { PNG } from 'pngjs'
import fs from 'fs'
const img = PNG.sync.read(fs.readFileSync('/tmp/opencode/qa-kb.png'))
const W = 100, H = 40
const cw = img.width / W, ch = img.height / H
const cls = (r, g, b) => {
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  if (L < 40) return '.'
  if (L > 235 && r > 230 && g > 230 && b > 230) return 'W'
  if (g > 25 && g - r >= 4 && g - b >= 5 && b < 120) return 'G'
  if (r > 80 && r - b >= 25 && r - g >= 10 && g - b >= 5) return 'O'
  if (r > 90 && g > 80 && r - b >= 8 && Math.abs(r - g) < 45 && r < 235 && L > 60) return 'b'
  if (L > 120) return '#'
  return 'd'
}
let s = ''
for (let row = 0; row < H; row++) {
  let line = ''
  for (let col = 0; col < W; col++) {
    const x0 = Math.round(col * cw), y0 = Math.round(row * ch)
    let r = 0, g = 0, b = 0, n = 0
    for (let y = y0; y < Math.min(img.height, y0 + Math.floor(ch)); y += 2) {
      for (let x = x0; x < Math.min(img.width, x0 + Math.floor(cw)); x += 2) {
        const i = (y * img.width + x) * 4
        r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; n++
      }
    }
    line += cls(r / n, g / n, b / n)
  }
  s += line + '\n'
}
process.stdout.write(s)
