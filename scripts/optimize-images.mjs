import { readdir, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const srcDir = path.join(root, 'imagens', 'images')
const pub = path.join(root, 'public')

const outDirs = {
  team: path.join(pub, 'project', 'team'),
  launches: path.join(pub, 'project', 'launches'),
  journey: path.join(pub, 'project', 'journey'),
}

for (const d of Object.values(outDirs)) await mkdir(d, { recursive: true })
await mkdir(path.join(pub), { recursive: true })

/**
 * (matcher(s) no nome do arquivo) -> { dir, out, width }
 * Os retratos 1071×1428 e a paisagem mantêm proporção; otimizamos só a largura.
 */
const plan = [
  { match: '16.28.56', dir: outDirs.team, out: 'pessoa-1.jpg', width: 720 },
  { match: '16.28.54', dir: outDirs.team, out: 'pessoa-2.jpg', width: 720 },
  { match: '16.28.57', dir: outDirs.launches, out: 'foguete-grama.jpg', width: 1080 },
  { match: '16.28.53', dir: outDirs.launches, out: 'lancamento-panorama.jpg', width: 1400 },
  { match: '16.29.01', dir: outDirs.journey, out: 'jornada-paisagem.jpg', width: 1100 },
  { match: '16.29.02', dir: outDirs.journey, out: 'jornada-retrato.jpg', width: 900 },
  { match: '16.28.59', dir: outDirs.journey, out: 'jornada-prep-a.jpg', width: 900 },
  { match: '16.29.00', dir: outDirs.journey, out: 'jornada-prep-b.jpg', width: 900 },
]

const files = await readdir(srcDir)

async function findSrc(match) {
  const name = files.find((f) => f.includes(match) && f.endsWith('.jpeg'))
  if (!name) throw new Error(`Arquivo com "${match}" não encontrado em ${srcDir}`)
  return path.join(srcDir, name)
}

for (const item of plan) {
  const src = await findSrc(item.match)
  const out = path.join(item.dir, item.out)
  await sharp(src)
    .rotate()
    .resize({ width: item.width, withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(out)
  const info = await sharp(out).metadata()
  console.log(`${item.out.padEnd(26)} ${info.width}×${info.height}`)
}

// Logo: versão leve para navbar/footer + PNGs de favicon + apple-touch
const logoSrc = files.find((f) => f.toLowerCase().includes('logo'))
if (!logoSrc) throw new Error('logo image.jpeg não encontrado')
const logoPath = path.join(srcDir, logoSrc)

for (const [out, width] of [
  ['logo.jpg', 320],
  ['logo-192.png', 192],
  ['logo-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  await sharp(logoPath).rotate().resize({ width, withoutEnlargement: true }).toFile(path.join(pub, out))
  console.log(`${out.padEnd(26)} ${width}px`)
}

console.log('\nImagens otimizadas para public/ ✔')