import { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import { office, subscribeOffice } from './officeState'

/**
 * Callouts de descoberta em screen-space (§28/§30): pequenos rótulos que
 * apontam para o mouse físico e o botão da impressora. Usam <Html> do drei,
 * projetando o alvo real no vidro — a seta fica presa no objeto, não no DOM.
 *
 * Aparecem apenas em estado de descoberta (ambient, nada pendente) e
 * desaparecem quando a respectiva interação foi usada — nunca encobrem o
 * caminho principal.
 */
export function CalloutLayer() {
  const [, setTick] = useState(0)

  useEffect(() => subscribeOffice(() => setTick((t) => t + 1)), [])

  const discoverable = office.mode === 'ambient' && !office.qrPreview && office.printer.state === 'idle'
  const showMouse = discoverable && !office.usedComputer
  const showPrinter = discoverable && !office.printedPaper

  return (
    <>
      {showMouse && office.calloutTargets.mouse.lengthSq() > 0 ? (
        <Html
          position={office.calloutTargets.mouse.toArray() as [number, number, number]}
          center={false}
          zIndexRange={[30, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="office-callout office-callout--mouse">
            <span>Clique para controlar o computador</span>
            <span className="office-callout__arrow" aria-hidden="true" />
          </div>
        </Html>
      ) : null}

      {showPrinter && office.calloutTargets.printer.lengthSq() > 0 ? (
        <Html
          position={office.calloutTargets.printer.toArray() as [number, number, number]}
          center={false}
          zIndexRange={[30, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="office-callout office-callout--printer">
            <span>Ver QR code</span>
            <span className="office-callout__arrow" aria-hidden="true" />
          </div>
        </Html>
      ) : null}
    </>
  )
}