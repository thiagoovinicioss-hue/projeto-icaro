#!/usr/bin/env node
/**
 * Varre o conteúdo factual do projeto e avisa qualquer "TODO_REAL_CONTENT"
 * que ainda esteja pendente antes de publicar.
 *
 *   npm run content:check
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const placeholder = 'TODO_REAL_CONTENT'
const report = []

async function scan(file) {
  try {
    const text = await readFile(path.join(root, file), 'utf8')
    const lines = text.split('\n')
    const hits = []
    lines.forEach((line, i) => {
      if (line.includes(placeholder) && !line.includes('TODO_REAL_CONTENT =')) {
        hits.push(`    ${String(i + 1).padStart(4)} · ${line.trim().slice(0, 120)}`)
      }
    })
    if (hits.length) report.push({ file, hits })
  } catch (err) {
    report.push({ file, hits: [`    (não foi possível ler: ${err.message})`] })
  }
}

await scan('src/data/project.ts')

if (report.length === 0) {
  console.log('\n  ✓ Conteúdo real completo — nenhum placeholder pendente.\n')
} else {
  console.log('\n  Aviso: ainda existem placeholders não preenchidos em src/data/project.ts\n')
  for (const r of report) {
    console.log(`  ${r.file}`)
    for (const h of r.hits) console.log(h)
  }
  console.log(`
  Preencha os campos marcados com ${placeholder} e rode:
    npm run content:check

  (O site continua navegável com placeholders claramente sinalizados,
   mas não publique uma campanha sem conteúdo real.)\n`)
  process.exit(report.length ? 1 : 0)
}