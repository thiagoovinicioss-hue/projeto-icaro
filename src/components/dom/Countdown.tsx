import { countdownAt } from '../../story/chapters'
import { useSimValue } from '../../hooks/useSimValue'
import { sim } from '../../utils/sim'

/**
 * 3 · 2 · 1 · lançamento — pressure release, driven by the world clock
 * (scroll), never by a timer. Reversible: scroll up and the countdown
 * resets exactly like it happened.
 */
export function Countdown() {
  const t = useSimValue(() => sim.smooth, 0.001)
  const digit = countdownAt(t)

  if (digit === null) return null

  return (
    <div className="countdown" aria-live="polite">
      {digit === '0' ? (
        <div className="countdown-launch">
          <span className="countdown-launch__small">LANÇAMENTO</span>
        </div>
      ) : (
        <div className="countdown-digit">
          <span key={digit} className="countdown-digit__value">
            {digit}
          </span>
          <span className="visually-hidden">Iniciando lançamento em {digit}</span>
        </div>
      )}
    </div>
  )
}