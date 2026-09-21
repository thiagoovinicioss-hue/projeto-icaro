import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Chapter } from '../../../story/chapters'
import { project } from '../../../data/project'
import { PlaceholderText } from '../PlaceholderText'
import { supportsWebGL } from '../../../utils/webgl'
import { quality } from '../../../utils/sim'
import { formatNoteDate, memoryStages } from '../../../data/memoryCalendar'
import { MemoryScene, type MemorySceneApi } from '../../three/memory/MemoryScene'
import { SectionHeader } from './SectionHeader'

const TOTAL = memoryStages.length

/** Monta o Canvas 3D apenas enquanto a seção está na tela (desmonta ao sair). */
function useInView(rootMargin = '15% 0px 15% 0px'): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const prev = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const io = new IntersectionObserver((entries) => {
      const hit = entries[0]?.isIntersecting ?? false
      if (hit !== prev.current) setInView(hit)
      prev.current = hit
    }, { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])
  return [ref, inView]
}

export function OriginSection({ chapter }: { chapter: Chapter }) {
  const [viewRef, inView] = useInView()
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const sceneApi = useRef<MemorySceneApi | null>(null)
  const webgl = useMemo(() => supportsWebGL(), [])

  const stage = memoryStages[index]
  const atLast = index === TOTAL - 1
  const atFirst = index === 0

  const next = useCallback(() => {
    if (busy) return
    sceneApi.current?.next()
  }, [busy])

  const prev = useCallback(() => {
    if (busy) return
    sceneApi.current?.prev()
  }, [busy])

  // avança com a seta →/← do teclado enquanto a seção está visível
  useEffect(() => {
    if (!inView) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      e.preventDefault()
      if (e.key === 'ArrowRight') next()
      else prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inView, next, prev])

  return (
    <div className="origin-memory">
      <div className="origin-memory__copy">
        <SectionHeader chapter={chapter} />
        {project.originStory.map((par, i) => (
          <p key={i} className="chapter-body">
            <PlaceholderText>{par}</PlaceholderText>
          </p>
        ))}
      </div>

      <div ref={viewRef} className={`origin-memory__scene${inView ? ' is-visible' : ''}`}>
        {inView && webgl && (
          <>
            <MemoryScene
              index={index}
              reduced={quality.reducedMotion}
              onBusy={setBusy}
              onStageChange={setIndex}
              api={sceneApi}
            />
            <div className="memory-arrows" aria-hidden="true">
              <button
                type="button"
                className="memory-arrow memory-arrow--prev"
                onClick={prev}
                disabled={busy}
                title="Voltar etapa"
                aria-label="Voltar para a etapa anterior"
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 6l-6 6 6 6"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <p className="memory-hint">
                <span className="memory-hint__kbd">→</span> clique na seta para ver a próxima
              </p>

              <button
                type="button"
                className="memory-arrow memory-arrow--next"
                onClick={next}
                disabled={busy}
                title={atLast ? 'Voltar ao começo' : 'Avançar etapa'}
                aria-label={atLast ? 'Voltar ao começo da memória' : 'Avançar para a próxima etapa'}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      <div className="origin-memory__controls">
        <p className="memory-note" aria-hidden="false">
          <span className="memory-note__date">
            {stage?.date ? formatNoteDate(stage.date) : 'data a publicar'}
          </span>
          <span className="memory-note__dash" aria-hidden="true">
            —
          </span>
          <span className="memory-note__text">
            <mark className="memory-note__hl">{stage?.markWord}</mark>
            {stage ? stage.title.slice(stage.markWord.length) : ''}
          </span>
        </p>

        <div className="memory-pager">
          <span className="memory-pager__count" aria-hidden="true">
            {String(index + 1).padStart(2, '0')} / {String(TOTAL).padStart(2, '0')}
          </span>
          <span className="memory-pager__nav" aria-hidden="true">
            {atFirst ? null : <span className="memory-pager__kbd">← voltar</span>}
            <span className="memory-pager__kbd">→ avançar</span>
          </span>
        </div>
      </div>

      <p className="visually-hidden" role="status">
        {typeof stage !== 'undefined'
          ? `Etapa ${index + 1} de ${TOTAL}: ${stage.title}`
          : `Memória de ${TOTAL} etapas.`}
      </p>
    </div>
  )
}