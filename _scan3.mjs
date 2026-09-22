import { PNG } from 'pngjs'
import fs from 'fs'

const f = process.argv[2]
const { width: W, height: H, data } = PNG.sync.read(fs.readFileSync(f))
const [cx, cy, r] = process.argv.slice(3).map(Number)
let maxv = 0, maxp = ''
const hits = []
for (let y = cy - r; y <= cy + r; y++) {
  for (let x = cx - r; x <= cx + r; x++) {
    const i = (y * W + x) * 4
    const [R, G, B] = [data[i], data[i + 1], data[i + 2]]
    const max = Math.max(R, G, B)
    if (max > maxv) { maxv = max; maxp = `${x},${y}:${R},${G},${B}` }
    if (R > 120 && G > 120 && B > 110) hits.push(`${x},${y}:${R},${G},${B}`)
  }
}
console.log('max=', maxp)
console.log('hits(' + hits.length + '):', hits.slice(0, 12).join('  '))
console.log('amostras da coluna central:')
for (let y = cy - r; y <= cy + r; y += 4) {
  const i = (y * W + cx) * 4
  console.log(' y=' + y, `${data[i]},${data[i + 1]},${data[i + 2]}`)
}
