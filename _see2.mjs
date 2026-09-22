import { PNG } from 'pngjs'
import fs from 'fs'
const img = PNG.sync.read(fs.readFileSync('/tmp/opencode/qa-kb.png'))
const W = 110, H = 50
const x0 = 250, y0 = 490
const cw = (img.width - x0) / W, ch = (img.height - y0) / H
const cls = (r, g, b) => {
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  if (L < 45) return '.'
  if (L > 235 && r > 230 && g > 230 && b > 230) return 'W'
  if (g > 25 && g - r >= 3 && g - b >= 5 && b < 130) return 'G'
  if (r > 60 && r - b >= 22 && r - g >= 8 && g - b >= 3) return 'O'
  if (r > 85 && g > 80 && r - b >= 8 && Math.abs(r - g) < 45 && r < 240 && L > 55 && L < 220) return 'b'
  if (L > 130) return '#'
  return 'd'
}
let s = ''
for (let row = 0; row < H; row++) {
  let line = ''
  for (let col = 0; col < W; col++) {
    const px0 = Math.round(x0 + col * cw), py0 = Math.round(y0 + row * ch)
    let r = 0, g = 0, b = 0, n = 0
    for (let y = py0; y < Math.min(img.height, py0 + Math.ceil(ch)); y += 2) {
      for (let x = px0; x < Math.min(img.width, px0 + Math.ceil(cw)); x += 2) {
        const i = (y * img.width + x) * 4
        r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; n++
      }
    }
    line += cls(r / n, g / n, b / n)
  }
  s += line + '\n'
}
process.stdout.write(s)
