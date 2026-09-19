import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { hasRealPixPayload } from '../../utils/pix'

/**
 * Pix QR generated locally from the static payload in src/data/project.ts.
 * Nothing leaves the browser and nothing hits a remote API.
 */
export function QrPix({ payload, pending }: { payload: string | null; pending: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (pending || !hasRealPixPayload(payload)) return
    QRCode.toCanvas(canvas, payload.trim(), {
      margin: 1,
      width: 240,
      color: { dark: '#020812', light: '#f5f7fa' },
      errorCorrectionLevel: 'M',
    }).catch(() => {
      /* invalid payload — leave the key visible instead */
    })
  }, [payload, pending])

  if (pending || !hasRealPixPayload(payload)) return null

  return (
    <figure className="qr-block">
      <div className="qr-frame">
        <canvas ref={canvasRef} aria-label="QR Code Pix para doação" role="img" />
      </div>
      <figcaption>Escaneie para abrir o Pix</figcaption>
    </figure>
  )
}