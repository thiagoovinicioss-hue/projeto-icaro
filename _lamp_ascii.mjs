import { PNG } from 'pngjs'
import fs from 'fs'

const SHOT = '/tmp/opencode/lamp-isolated.png'
const img = PNG.sync.read(fs.readFileSync(SHOT))
const W = img.width, H = img.height
const at = (x, y) => { const i = (y * W + x) * 4; return [img.data[i], img.data[i+1], img.data[i+2]] }
const lum = ([r,g,b]) => 0.2126*r+0.7152*g+0.0722*b

// classifica cada pixel num caractere
function cls(x, y) {
  const [r, g, b] = at(x, y)
  const L = lum([r, g, b])
  const warm = r > g + 25
  const cream = r > 130 && r > g && g > b && r - b > 18
  const bronze = r > 30 && r < 150 && r > g && g > b && L < 110 && !cream
  if (L < 14) return '.'        // fundo escuro
  if (warm && L > 155) return 'O'  // interior/luz quente
  if (cream) return 'C'          // esmalte creme
  if (warm && L > 70) return 'W' // pool de luz / madeira iluminada
  if (bronze) return 'B'         // metal bronze/latão
  if (L > 22) return '#'         // outro (metal escuro etc)
  return ' '
}

// downsampling para ASCII
const COLS = 110, ROWS = 42
const cw = Math.floor(W / COLS), ch = Math.floor(H / ROWS)
let out = ''
for (let r = 0; r < ROWS; r++) {
  let line = ''
  for (let c = 0; c < COLS; c++) {
    const x0 = c * cw, y0 = r * ch
    // amostra o pixel central da célula
    const x = x0 + Math.floor(cw / 2), y = y0 + Math.floor(ch / 2)
    line += cls(x, y)
  }
  out += line + '\n'
}
console.log('size', W + 'x' + H)
console.log(out)

// métricas por classe (contagem global)
const counts = {}
for (let y = 0; y < H; y+=2) for (let x = 0; x < W; x+=2) {
  const c = cls(x, y); counts[c] = (counts[c] || 0) + 1
}
console.log('classes:', JSON.stringify(counts))