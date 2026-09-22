import { PNG } from 'pngjs'
import fs from 'fs'

const img = PNG.sync.read(fs.readFileSync(process.argv[2] ?? '/tmp/opencode/comp-baseline.png'))
const w = img.width, h = img.height

function sample(x, y) {
  const i = (y * w + x) * 4
  return [img.data[i], img.data[i + 1], img.data[i + 2]]
}

function scan(name, pred) {
  const grid = []
  const STEP = 8
  for (let y = 0; y < h; y += STEP) {
    const row = []
    for (let x = 0; x < w; x += STEP) {
      let hit = 0, n = 0
      for (let dy = 0; dy < STEP; dy += 2) {
        for (let dx = 0; dx < STEP; dx += 2) {
          const [r, g, b] = sample(x + dx, y + dy)
          if (pred(r, g, b)) hit++
          n++
        }
      }
      row.push(hit / n > 0.35 ? 1 : 0)
    }
    grid.push(row)
  }
  // find bounding boxes of 1-blobs (rough cluster union)
  const gw = grid[0].length
  const boxes = []
  const seen = new Set()
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < gw; x++) {
      if (!grid[y][x] || seen.has(y * gw + x)) continue
      const stack = [[x, y]]
      seen.add(y * gw + x)
      let minX = x, maxX = x, minY = y, maxY = y, cnt = 0
      while (stack.length) {
        const [cx, cy] = stack.pop()
        cnt++
        minX = Math.min(minX, cx); maxX = Math.max(maxX, cx)
        minY = Math.min(minY, cy); maxY = Math.max(maxY, cy)
        for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
          if (nx >= 0 && nx < gw && ny >= 0 && ny < grid.length && grid[ny][nx] && !seen.has(ny * gw + nx)) {
            seen.add(ny * gw + nx)
            stack.push([nx, ny])
          }
        }
      }
      if (cnt < 6) continue
      boxes.push(`  x${(minX * STEP).toString().padStart(4)}..${(maxX * STEP).toString().padStart(4)}  y${(minY * STEP).toString().padStart(4)}..${(maxY * STEP).toString().padStart(4)}  (${cnt}cel)`)
    }
  }
  console.log(`[${name}]`)
  for (const b of boxes) console.log(b)
}

scan('VERDE fosforo (tela CRT)', (r, g, b) => g > 45 && g - r > 6 && g > b + 6)
scan('BEIGE creme (carcaças/papel)', (r, g, b) => r > 200 && g > 185 && b > 140 && Math.abs(r - g) < 26 && r - b < 80)
scan('MADEIRA marrom', (r, g, b) => r > 60 && r < 200 && r - b > 20 && r - g > 2 && b < 150)
scan('ESCURO quase preto', (r, g, b) => {
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return L < 30
})