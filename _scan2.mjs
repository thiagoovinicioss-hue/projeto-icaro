import { PNG } from 'pngjs'
import fs from 'fs'

const { width: W, height: H, data } = PNG.sync.read(fs.readFileSync(process.argv[2]))
const at = (x, y) => {
  const i = (y * W + x) * 4
  return `${data[i]},${data[i + 1]},${data[i + 2]}`
}
const probe = (label, pts) => {
  for (const [name, [x, y]] of pts) {
    console.log(label.padEnd(8), name.padEnd(14), `${x},${y} →`, at(x, y))
  }
}
// localizar a face do monitor: linha horizontal de perfil em y=220 (meio da tela) e y=60 (acima da tela)
console.log('y=60 :', Array.from({ length: 32 }, (_, i) => (i * 40).toString().padStart(2) + ':' + at(i * 40, 60)).join(' '))
console.log('y=220:', Array.from({ length: 32 }, (_, i) => (i * 40).toString().padStart(2) + ':' + at(i * 40, 220)).join(' '))
console.log('y=420:', Array.from({ length: 32 }, (_, i) => (i * 40).toString().padStart(2) + ':' + at(i * 40, 420)).join(' '))
