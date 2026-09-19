import { readFile, writeFile } from 'node:fs/promises'
import { Resvg } from '@resvg/resvg-js'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const svg = await readFile(path.join(root, 'public', 'og.svg'), 'utf8')
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  background: '#020812',
})
const png = resvg.render().asPng()
await writeFile(path.join(root, 'public', 'og-image.png'), png)
console.log('og-image.png gerado:', png.length, 'bytes')