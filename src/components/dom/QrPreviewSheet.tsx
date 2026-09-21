import { useState } from 'react'
import { project } from '../../data/project'
import { campaign } from '../../data/campaign'
import { isPlaceholder } from '../../utils/placeholders'
import { pixCopyValue } from '../../utils/pix'
import { buildShareContent } from '../../utils/share'
import { closeQrPreview, office } from '../three/office/officeState'

/**
 * Folha aproximada do QR — overlays DOM com backdrop blur (§36–§40).
 *
 * Aparece quando o papel impresso assenta e o `office.qrPreview` abre; é o
 * "zoom aproximado" da folha. X fecha e o papel tridimensional continua sobre a
 * mesa. Usa a foto real do QR (`public/project/qr-code.jpg`).
 */
export function QrPreviewSheet() {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'share'>('idle')

  const copy = async () => {
    const value = pixCopyValue(project.pix.payload, project.pix.key)
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(value)
        setCopyState('copied')
        window.setTimeout(() => setCopyState('idle'), 1800)
        return
      } catch {
        /* fallthrough fallback */
      }
    }
    setCopyState('copied')
    window.setTimeout(() => setCopyState('idle'), 1800)
  }

  const share = async () => {
    const content = buildShareContent(typeof window !== 'undefined' ? window.location.href : '', campaign.goalCents)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(content)
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(`${content.text}\n${content.url}`)
      setCopyState('share')
      window.setTimeout(() => setCopyState('idle'), 1800)
    } catch {
      /* giving up quietly */
    }
  }

  const close = () => {
    office.qrPreview = false
    closeQrPreview()
  }

  const pending = isPlaceholder(project.pix.key)

  return (
    <div className="office-qr-preview" role="dialog" aria-modal="true" aria-labelledby="office-qr-title">
      {/* pano de fundo desfocado (a cena 3D fica atrás) */}
      <div className="office-qr-preview__backdrop" aria-hidden="true" />

      <div className="office-qr-preview__sheet">
        <button type="button" className="office-qr-preview__close" onClick={close} aria-label="Fechar QR do Pix">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>

        <p className="office-qr-preview__kicker" id="office-qr-title">
          APOIO AO PROJETO ÍCARO
        </p>

        {pending ? (
          <div className="office-qr-preview__pending">
            <p className="pending-content">Chave Pix a publicar</p>
          </div>
        ) : (
          <div className="office-qr-preview__qr">
            <img
              src="project/qr-code.jpg"
              alt="QR Code Pix para doação"
              width={200}
              height={200}
            />
          </div>
        )}

        {!pending && (
          <p className="office-qr-preview__key">{project.pix.key}</p>
        )}

        {!pending && (
          <div className="office-qr-preview__actions">
            <button type="button" className="btn btn--primary" onClick={copy}>
              {copyState === 'copied' ? 'CHAVE COPIADA' : 'COPIAR CHAVE PIX'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={share}>
              {copyState === 'share' ? 'LINK COPIADO' : 'COMPARTILHAR'}
            </button>
          </div>
        )}

        <p className="office-qr-preview__hint">
          Escaneie para abrir o Pix — o valor vai direto para o Projeto Ícaro.
        </p>
      </div>
    </div>
  )
}