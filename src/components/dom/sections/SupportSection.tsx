import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ComponentType } from 'react'
import type { Chapter } from '../../../story/chapters'
import { PixArea } from '../PixArea'
import { SectionHeader } from './SectionHeader'

/**
 * Seção de apoio — caminho padrão 100% 2D (§2–§6).
 *
 * REGRA ABSOLUTA: a experiência 3D só existe DEPOIS do clique em
 * "VER AMBIENTAÇÃO 3D". Aqui não há import de three/drei/office: nada de
 * WebGLRenderer, canvas, RAF, modelos ou texturas no caminho inicial. O Pix
 * abre instantâneo; a ambientação é uma bonificação opcional, carregada em
 * chunk separado via import() dinâmico.
 */

type Phase = 'idle' | 'loading' | 'open' | 'error'

type OfficeExperienceProps = { onClose: () => void }

const OFFICE_IMPORT = () => import('../../three/office/OfficeExperience')

export function SupportSection({ chapter }: { chapter: Chapter }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [Experience, setExperience] = useState<ComponentType<OfficeExperienceProps> | null>(null)
  const alive = useRef(true)
  const cancelled = useRef(false)

  useEffect(() => {
    // rearma a cada montagem de verdade: em dev o React.StrictMode monta →
    // desmonta (simulado) → remonta o efeito. Sem rearmar aqui, o cleanup deixa
    // alive=false e, quando o import() resolve, o guard descarta o componente e
    // a fase fica presa em 'loading' indefinidamente (§48). Em prod não há
    // StrictMode, por isso era um sintoma exclusivo do dev.
    alive.current = true
    cancelled.current = false
    return () => {
      alive.current = false
    }
  }, [])

  const launch = async () => {
    if (phase !== 'idle') return
    cancelled.current = false
    setPhase('loading')
    try {
      const mod = await OFFICE_IMPORT()
      if (!alive.current || cancelled.current) return
      setExperience(() => mod.OfficeExperience)
      setPhase('open')
    } catch {
      if (!alive.current || cancelled.current) return
      setPhase('error')
    }
  }

  const close = () => {
    cancelled.current = true
    setExperience(null)
    setPhase('idle')
  }

  return (
    <div className="support-shell">
      <div className="support-copy">
        <SectionHeader chapter={chapter} gold />
        <p className="chapter-body chapter-body--center">
          Quem apoia não compra um pedaço do foguete: entra para a missão. Ajuda a tirá-lo do chão
          e acompanha — junto com a gente — o que ele é capaz.
        </p>
      </div>

      {/* caminho rápido: chave, copiar, compartilhar — sem 3D, sem espera */}
      <PixArea />

      {/* bonificação opcional — nunca substitui o Pix */}
      <div className="office-launch">
        <button
          type="button"
          className="office-launch__button"
          onClick={launch}
          disabled={phase !== 'idle'}
          aria-haspopup="dialog"
        >
          <span className="office-launch__icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M8.5 9.5l3 2.5-3 2.5M13.5 13.5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          VER AMBIENTAÇÃO 3D
        </button>
        <p className="office-launch__hint">
          Experiência opcional · escritório retrô da missão. Só carrega se você quiser.
        </p>
      </div>

      {/* estados de carregamento/erro e a experiência propriamente dita */}
      {phase === 'loading' ? <BootOverlay onCancel={close} /> : null}
      {phase === 'error' ? <ErrorOverlay onClose={close} /> : null}
      {phase === 'open' && Experience ? <Experience onClose={close} /> : null}
    </div>
  )
}

/* ------------------------------------------------------------- estados 3D */

function BootOverlay({ onCancel }: { onCancel: () => void }) {
  return (
    <Portal>
      <div className="office-gate" role="dialog" aria-modal="true" aria-label="Preparando ambientação 3D">
        <button type="button" className="office-gate__close" onClick={onCancel} aria-label="Cancelar carregamento e voltar ao Pix">
          <span aria-hidden="true">×</span>
        </button>

        <div className="office-gate__terminal" role="status">
          <p className="office-gate__line">
            <span className="office-gate__prompt" aria-hidden="true">&gt;</span>
            LIGANDO O TERMINAL…
          </p>
          <p className="office-gate__line office-gate__line--dim">
            montando mesa · ligando monitor &bull; aquecendo luminária
          </p>
          <span className="office-gate__cursor" aria-hidden="true" />
        </div>

        <div className="office-gate__indeterminate" aria-hidden="true">
          <span className="office-gate__bar" />
        </div>

        <p className="office-gate__hint">
          carregando ambiente · pode voltar quando quiser
        </p>
      </div>
    </Portal>
  )
}

function ErrorOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Portal>
      <div className="office-gate office-gate--error" role="alert">
        <button type="button" className="office-gate__close" onClick={onClose} aria-label="Fechar aviso e voltar ao Pix">
          <span aria-hidden="true">×</span>
        </button>
        <p className="office-gate__line office-gate__line--error">
          A ambientação 3D não pôde ser carregada.
        </p>
        <p className="office-gate__hint">
          O Pix continua funcionando normalmente. Toque para voltar e copiar a chave.
        </p>
        <button type="button" className="office-gate__back" onClick={onClose}>
          VOLTAR AO PIX
        </button>
      </div>
    </Portal>
  )
}

function Portal({ children }: { children: React.ReactNode }) {
  const el = useRef<HTMLDivElement | null>(null)
  if (!el.current) el.current = document.createElement('div')
  useEffect(() => {
    const node = el.current!
    document.body.appendChild(node)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.removeChild(node)
    }
  }, [])
  return createPortal(children, el.current)
}