#!/usr/bin/env node
/**
 * Atualiza o valor arrecadado da campanha — 100% local.
 *
 *   npm run funding -- 50        # R$ 50,00
 *   npm run funding -- 120,50    # R$ 120,50
 *   npm run funding -- --reset   # volta a R$ 0
 *
 * Valida, converte para centavos, grava src/data/campaign.ts e mostra o
 * resumo no terminal. Não toca em nenhum serviço externo.
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const campaignPath = path.resolve(__dirname, '..', 'src', 'data', 'campaign.ts')

function parseReal(input) {
  const normalized = String(input).trim().replace(/\./g, '').replace(/,/g, '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount < 0) return null
  const cents = Math.round(amount * 100)
  if (!Number.isSafeInteger(cents)) return null
  return cents
}

const args = process.argv.slice(2)

if (args.includes('--reset')) {
  await writeRaised(0)
} else if (args.length === 0) {
  console.error('Uso: npm run funding -- <valor> | --reset')
  process.exit(1)
} else {
  const cents = parseReal(args[0])
  if (cents === null) {
    console.error(`Valor inválido: "${args[0]}" (use números como 50 ou 120,50).`)
    process.exit(1)
  }
  await writeRaised(cents)
}

const fmt = (c) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c / 100)

async function writeRaised(cents) {
  const source = await readFile(campaignPath, 'utf8')
  const today = new Date().toISOString()
  const next = source
    .replace(/goalCents:\s*\d+/, (m) => m)
  void next
  const rewritten = source
    .replace(/raisedCents:\s*\d+/, `raisedCents: ${cents}`)
    .replace(
      /lastUpdated:\s*(null|"[^"]*")/,
      `lastUpdated: '${today}'`,
    )
  await writeFile(campaignPath, rewritten)
  const after = await readFile(campaignPath, 'utf8')
  const goal = Number(/goalCents:\s*(\d+)/.exec(after)?.[1] ?? 0)
  const pct = goal > 0 ? ((cents / goal) * 100).toFixed(2) : '0.00'
  console.log(`\nProjeto Ícaro — arrecadação atualizada`)
  console.log(`  Arrecadado: ${fmt(cents)}`)
  console.log(`  Meta:       ${fmt(goal)}`)
  console.log(`  Progresso:  ${pct}%`)
  console.log(`  Atualizado: ${today}\n`)
}