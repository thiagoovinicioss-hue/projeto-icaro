import { PNG } from 'pngjs'
import fs from 'fs'
const img = PNG.sync.read(fs.readFileSync('/tmp/opencode/qa-kb.png'))
const x0 = 380, y0 = 555, x1 = 940, y1 = 705
const W = 112, H = 30
const cw = (x1 - x0) / W, ch = (y1 - y0) / H
const cls = (r, g, b) => {
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  if (L < 50) return '.'
  if (r > 150 && g > 135 && r - b > 20 && Math.abs(r - g) < 40 && L > 110 && L < 220) return 'K'   // teclado/carcaça bege
  if (L > 230) return 'W'
  if (r > 70 && r - g > 12 && r - b > 40 && g > 40) return 'w'   // madeira
  if (g > 25 && g - r >= 3 && g - b >= 5) return 'G'
  if (L > 100) return '#'
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
console.log('x-range', x0, '→', x1, '  y-range', y0, '→', y1)
