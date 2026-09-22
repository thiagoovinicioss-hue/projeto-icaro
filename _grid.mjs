import { PNG } from 'pngjs'
import fs from 'fs'

const file = process.argv[2]
const { width: w, height: h, data } = PNG.sync.read(fs.readFileSync(file))
const cols = 20, rows = 12
const cw = Math.floor(w / cols), ch = Math.floor(h / rows)
const palette = {
  beige: '\x1b[33mB', dark: '\x1b[90m.', green: '\x1b[32mG', glow: '\x1b[92mg',
  red: '\x1b[31mR', white: '\x1b[97mW', brown: '\x1b[38;5;94m#', black: '\x1b[30m.',
}
const classify = (r, g, b) => {
  if (r > 190 && g > 190 && b > 190) return 'W'
  if (g > 120 && g > r * 1.3 && g > b) return 'g'
  if (g > 60 && g > r * 1.2 && g > b * 1.2) return 'G'
  if (r > 140 && r > b * 1.5 && Math.abs(r - g) < 60) return 'R'
  if (r > 95 && g > 85 && b < 240 && r > b && r - b > 8) return 'B'
  if (r > 60 && g > 50 && b < 150 && r > b) return '#'
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum < 30 ? '.' : ' '
}
for (let row = 0; row < rows; row++) {
  let line = ''
  for (let col = 0; col < cols; col++) {
    let r = 0, g = 0, b = 0, n = 0
    for (let y = row * ch; y < (row + 1) * ch; y += 4) {
      for (let x = col * cw; x < (col + 1) * cw; x += 4) {
        const i = (y * w + x) * 4
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
      }
    }
    const rr = r / n, gg = g / n, bb = b / n
    line += palette[classify(rr, gg, bb)] || '?'
    line += classify(rr, gg, bb)
  }
  console.log(String(row).padStart(2) + ' ' + line)
}
console.log(`cols=${cw}px rows=${ch}px`)
