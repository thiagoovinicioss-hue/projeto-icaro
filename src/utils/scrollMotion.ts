import { quality, sim } from './sim'
import { clamp01 } from './spline'

/**
 * Motor de motion dirigido pela MESMA fonte de verdade do relógio do mundo
 * (scroll nativo + damping do Conductor). A mesma posição de scroll produz o
 * mesmo estado, sempre reversível. Um único rAF do módulo atualiza todos os
 * elementos afiliados gravando custom properties no DOM (sem re-render React):
 *
 *   --rv  0..1  progresso de revelação (janela de entrada)
 *   --rvs 0..1  versão suavizada (smoothstep) — inclui a máscara de saída
 *   --rvp 0..1  travessia do viewport (parallax de camadas)
 *
 * Dois modos de registro:
 *
 * 1. `registerScrollMotion`  — janela por POSIÇÃO no viewport (elementos de
 *    corpo, parágrafos, listas, fotos que precisam revelar ao entrar na tela).
 * 2. `registerStoryMotion`   — janela por TEMPO DE MUNDO **exato** (`sim.target`,
 *    o relógio derivado diretamente do scroll nativo — a mesma fonte de
 *    verdade do 3D em repouso, mas SEM o damping cinematográfico). Assim os
 *    textos revelam no instante em que o scroll os alcança, mesmo em rolagem
 *    rápida, em vez de atrasar até o relógio suavizado alcançá-los. Usado nas
 *    transições de capítulo: entrada com overlap (começa antes do corte) e
 *    máscara de saída que fecha depois dele.
 *
 * Nada é alocado por frame; escritas repetidas são descartadas por threshold.
 * Reduced-motion grava o estado final imediato (fonte única: quality).
 */

export type ScrollMotionOptions = {
  /** Janela de travessia (raw) em que a revelação acontece. */
  from?: number
  to?: number
  /** Callback customizado (substitui a escrita das custom properties). */
  onProgress?: (p: number, s: number, raw: number) => void
}

/**
 * Modo "tudo visível": grava o estado final em todo elemento registrado e
 * desliga o loop de revelação por scroll. Usado para páginas que devem
 * mostrar o conteúdo inteiro de cara, sem depender de rolagem.
 */
let revealImmediate = true

/** Liga/desliga a revelação imediata (sem animação dependente de scroll). */
export function setRevealImmediate(on: boolean): void {
  revealImmediate = on
}

export type StoryMotionOptions = {
  /** Janela de entrada em tempo de mundo (0..1). Padrão: [0, 1]. */
  fromT?: number
  toT?: number
  /** Janela de saída em tempo de mundo — o elemento se desfaz ao sair. */
  exitFromT?: number
  exitToT?: number
  /** Callback customizado (substitui a escrita das custom properties). */
  onProgress?: (p: number, s: number, raw: number) => void
}

type ViewportEntry = {
  el: HTMLElement
  from: number
  to: number
  onProgress: (p: number, s: number, raw: number) => void
  lastWrite: number
}

type StoryEntry = {
  el: HTMLElement
  fromT: number
  toT: number
  exitFromT: number
  exitToT: number
  onProgress: (p: number, s: number, raw: number) => void
  lastWrite: number
}

const viewportEntries = new Set<ViewportEntry>()
const storyEntries = new Set<StoryEntry>()
let raf = 0

/** Progresso bruto de um elemento atravessando o viewport (0..1). */
export function rawProgress(el: HTMLElement): number {
  if (!el.isConnected) return 1
  const rect = el.getBoundingClientRect()
  const vh = window.innerHeight || 800
  const denom = vh + rect.height
  if (denom <= 0) return 1
  return Math.min(1, Math.max(0, (vh - rect.top) / denom))
}

export function smooth01(x: number): number {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}

function writeVars(el: HTMLElement, p: number, s: number, raw: number): void {
  el.style.setProperty('--rv', p.toFixed(4))
  el.style.setProperty('--rvs', s.toFixed(4))
  el.style.setProperty('--rvp', raw.toFixed(4))
}

function computeViewport(entry: ViewportEntry): { p: number; s: number; raw: number } {
  const raw = rawProgress(entry.el)
  const span = entry.to - entry.from
  const p = span <= 0 ? 1 : clamp01((raw - entry.from) / span)
  return { p, s: smooth01(p), raw }
}

function computeStory(entry: StoryEntry): { p: number; s: number; raw: number } {
  const t = sim.target
  const span = entry.toT - entry.fromT
  let p = span <= 0 ? 1 : clamp01((t - entry.fromT) / span)
  if (entry.exitToT > entry.exitFromT) {
    p *= 1 - clamp01((t - entry.exitFromT) / (entry.exitToT - entry.exitFromT))
  }
  const raw = rawProgress(entry.el)
  return { p, s: smooth01(p), raw }
}

function invoke(entry: ViewportEntry | StoryEntry, p: number, s: number, raw: number): void {
  const key = Math.round((p + raw) * 4000)
  if (key === entry.lastWrite) return
  entry.lastWrite = key
  entry.onProgress(p, s, raw)
}

function tick() {
  raf = 0
  for (const entry of viewportEntries) {
    const { p, s, raw } = computeViewport(entry)
    invoke(entry, p, s, raw)
  }
  for (const entry of storyEntries) {
    const { p, s, raw } = computeStory(entry)
    invoke(entry, p, s, raw)
  }
  start()
}

function start() {
  if (raf !== 0 || (viewportEntries.size === 0 && storyEntries.size === 0) || quality.reducedMotion) return
  raf = requestAnimationFrame(tick)
}

function makeCleanup(entry: ViewportEntry | StoryEntry, set: Set<ViewportEntry> | Set<StoryEntry>) {
  return () => {
    set.delete(entry as never)
  }
}

/**
 * Afilia um elemento a uma janela de POSIÇÃO no viewport. Devolve cleanup.
 * O elemento recebe --rv/--rvs/--rvp imediatamente (estado da posição atual).
 */
export function registerScrollMotion(
  el: HTMLElement,
  opts: ScrollMotionOptions = {},
): () => void {
  const onProgress =
    opts.onProgress ??
    ((p: number, s: number, raw: number) => writeVars(el, p, s, raw))
  if (revealImmediate) {
    onProgress(1, 1, 0.5)
    return () => {}
  }
  const entry: ViewportEntry = {
    el,
    from: opts.from ?? 0.1,
    to: opts.to ?? 0.6,
    onProgress,
    lastWrite: -1,
  }
  const cleanup = makeCleanup(entry, viewportEntries)
  if (quality.reducedMotion) {
    onProgress(1, 1, 0.5)
    return cleanup
  }
  viewportEntries.add(entry)
  const { p, s, raw } = computeViewport(entry)
  entry.lastWrite = Math.round((p + raw) * 4000)
  entry.onProgress(p, s, raw)
  start()
  return cleanup
}

/**
 * Afilia um elemento a uma janela de TEMPO DE MUNDO exato (`sim.target`, o
 * relógio direto do scroll nativo, sem o damping da câmera). Entrada com
 * overlap e máscara de saída opcional. Reversível e neutro em reduced-motion.
 */
export function registerStoryMotion(
  el: HTMLElement,
  opts: StoryMotionOptions = {},
): () => void {
  const onProgress =
    opts.onProgress ??
    ((p: number, s: number, raw: number) => writeVars(el, p, s, raw))
  if (revealImmediate) {
    onProgress(1, 1, 0.5)
    return () => {}
  }
  const entry: StoryEntry = {
    el,
    fromT: opts.fromT ?? 0,
    toT: opts.toT ?? 1,
    exitFromT: opts.exitFromT ?? 0,
    exitToT: opts.exitToT ?? 0,
    onProgress,
    lastWrite: -1,
  }
  const cleanup = makeCleanup(entry, storyEntries)
  if (quality.reducedMotion) {
    onProgress(1, 1, 0.5)
    return cleanup
  }
  storyEntries.add(entry)
  const { p, s, raw } = computeStory(entry)
  entry.lastWrite = Math.round((p + raw) * 4000)
  entry.onProgress(p, s, raw)
  start()
  return cleanup
}

/** Estado atual no relógio do mundo para um par de janelas — útil fora de um registro. */
export function storyState(
  t: number,
  fromT: number,
  toT: number,
  exitFromT = 0,
  exitToT = 0,
): { p: number; s: number } {
  const span = toT - fromT
  let p = span <= 0 ? 1 : clamp01((t - fromT) / span)
  if (exitToT > exitFromT) {
    p *= 1 - clamp01((t - exitFromT) / (exitToT - exitFromT))
  }
  return { p, s: smooth01(p) }
}