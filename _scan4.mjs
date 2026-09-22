import { PNG } from 'pngjs'
import fs from 'fs'

const f = process.argv[2]
const { width: W, height: H, data } = PNG.sync.read(fs.readFileSync(f))
// fósforo BRILHANTE (texto/UI) e fósforo escuro (fundo)
let bg0 = Infinity, bg1 = -1, tx0 = Infinity, tx1 = -1, ty0 = Infinity, ty1 = -1
let bright = 0, dark = 0, total = 0
for (let y = 0; y < H; y += 1) {
  for (let x = 0; x < W; x += 1) {
    const i = (y * W + x) * 4
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
    const green = g > r * 1.2 && g > b * 1.2
    if (!green) continue
    total++
    if (g < 120 && r < 60) {
      dark++
      if (x < bg0) bg0 = x
      if (x > bg1) bg1 = x
    } else if (g >= 120) {
      bright++
      if (x < tx0) tx0 = x
      if (x > tx1) tx1 = x
      if (y < ty0) ty0 = y
      if (y > ty1) ty1 = y
    }
  }
}
console.log('fundo-verde bbox x', bg0, '..', bg1, ' dark=', dark)
console.log('texto-verde  bbox x', tx0 !== Infinity ? tx0 : '-', '..', tx1, ' y', ty0, '..', ty1, ' bright=', bright)
console.log('total green =', total)
