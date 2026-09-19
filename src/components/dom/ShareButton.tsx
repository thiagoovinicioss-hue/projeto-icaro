import { useRef, useState } from 'react'
import { campaign } from '../../data/campaign'
import { buildShareContent } from '../../utils/share'

export function ShareButton({ label = 'COMPARTILHAR MISSÃO' }: { label?: string }) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const show = (msg: string) => {
    setFeedback(msg)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setFeedback(null), 2600)
  }

  const onClick = async () => {
    const shared = buildShareContent(typeof window !== 'undefined' ? window.location.href : '', campaign.goalCents)

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shared)
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(`${shared.text}\n${shared.url}`)
      show('Link da missão copiado.')
    } catch {
      show('Copie o link da barra de endereço.')
    }
  }

  return (
    <span className="share-holder">
      <button type="button" className="btn btn--ghost" onClick={onClick}>
        {label}
      </button>
      {feedback && (
        <span className="share-feedback" role="status">
          {feedback}
        </span>
      )}
    </span>
  )
}