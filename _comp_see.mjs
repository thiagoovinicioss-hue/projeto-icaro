import { PNG } from 'pngjs'
import fs from 'fs'

const path = process.argv[2] ?? '/tmp/opencode/comp-baseline.png'
const W = Number(process.argv[3] ?? 150)
const H = Number(process.argv[4] ?? 58)

const img = PNG.sync.read(fs.readFileSync(path))
const cw = img.width / W
const ch = img.height / H

const cls = (r, g, b) => {
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  if (L < 26) return ' '
  // verde do fósforo CRT
  if (g > 40 && g - r > 4 && g >= b - 6) return 'G'
  // emissive laranja quente
  if (r > 150 && g > 60 && b < 80 && r - b > 90) return '*'
  // bege clara (plástico creme, papel, teclas claras)
  if (L > 175 && r > 185 && g > 170) return '#'
  // madeira (marrom quente)
  if (r > 55 && r - b > 18 && r - g > 4 && g - b > 6) return 'o'
  // tom médio (mesa iluminada / sombra suave)
  if (L > 90) return '.'
  return ' '
}

let s = ''
for (let row = 0; row < H; row++) {
  let line = ''
  for (let col = 0; col < W; col++) {
    const x0 = Math.round(col * cw), y0 = Math.round(row * ch)
    let r = 0, g = 0, b = 0, n = 0
    for (let y = y0; y < Math.min(img.height, y0 + Math.floor(ch)); y += 1) {
      for (let x = x0; x < Math.min(img.width, x0 + Math.floor(cw)); x += 1) {
        const i = (y * img.width + x) * 4
        r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; n++
      }
    }
    line += cls(r / n, g / n, b / n) || '?'
  }
  s += line + '\n'
}
process.stdout.write(s)
console.log('  @ (bege claro) . (tom médio) o (madeira) G (tela CRT) * (quente)')