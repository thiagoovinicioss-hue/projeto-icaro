import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { OfficeScene } from './OfficeScene'
import { exitComputerMode, closeQrPreview, office, resetOfficeState, subscribeOffice } from './officeState'
import { quality } from '../../../utils/sim'
import { QrPreviewSheet } from '../../dom/QrPreviewSheet'
import { CampaignProgress } from './ExperienceHud'

/**
 * Experiência 3D como AMBIENTE DEDICADO (§10): overlay full-viewport por cima
 * da página, que segue existindo atrás. Só existe porque o usuário clicou em
 * "VER AMBIENTAÇÃO 3D" — e só é baixada (chunk separado) por import dinâmico.
 *
 * - Botão de sair (×) no canto superior direito;
 * - ESC fecha; ESC dentro do modo computer sai do computer-control primeiro
 *   e fecha na segunda tecla (comportamento previsível, §11);
 * - ao fechar, desmonta de verdade: RAF, listeners, canvas, WebGL resources.
 */
export function OfficeExperience({ onClose }: { onClose: () => void }) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const unsub = subscribeOffice(() => setTick((t) => t + 1))
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // capture (=== true) roda ANTES dos listeners do Canvas/controles,
      // garantindo a ordem: computador → QR/papel → fecha, um ESC por camada
      e.preventDefault()
      e.stopPropagation()
      if (office.mode === 'computer') {
        exitComputerMode()
        return
      }
      if (office.mode === 'qr-preview') {
        closeQrPreview()
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKey, true)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey, true)
      unsub()
      document.body.style.overflow = prevOverflow
      resetOfficeState()
    }
  }, [onClose])

  return createPortal(
    <div
      className="office-experience"
      role="dialog"
      aria-modal="true"
      aria-label="Ambientação 3D do escritório do Projeto Ícaro"
    >
      <button
        type="button"
        className="office-experience__close"
        onClick={onClose}
        aria-label="Fechar ambientação e voltar ao Pix"
      >
        <span aria-hidden="true">×</span>
        <span className="office-experience__close-label">Voltar</span>
      </button>

      <div className="office-experience__esc" aria-hidden="true">
        ESC — sair
      </div>

      <CampaignProgress />

      <div className="office-experience__stage">
        <OfficeScene reduced={quality.reducedMotion} />
      </div>

      {/* folha impressa aproximada — DOM sobre a cena, com blur atrás */}
      {office.qrPreview ? <QrPreviewSheet /> : null}
    </div>,
    document.body,
  )
}