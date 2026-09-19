import { useEffect, useRef } from 'react'
import { isPlaceholder } from '../../utils/placeholders'
import { quality } from '../../utils/sim'
import { registerScrollMotion } from '../../utils/scrollMotion'

type PhotoFigureProps = {
  src?: string
  alt: string
  caption?: string
  pending?: boolean
  ratio?: 'wide' | 'portrait' | 'square'
  className?: string
  motion?: boolean
  /** Modo de entrada da fotografia viva. */
  reveal?: 'lift' | 'clip'
}

/**
 * Editorial photo figure. Real photos are shown full-strength; pending
 * content renders a clearly-marked abstract placeholder — never a fake.
 * Real photos also get the scroll-driven motion layer (mask entry,
 * parallax and slow Ken Burns) — placeholders stay still.
 *
 * `reveal="lift"` (padrão): sobe por overflow. `reveal="clip"`: revela por
 * clip-path expandindo do centro — usado em fotos que fecham um capítulo.
 */
export function PhotoFigure({
  src,
  alt,
  pending,
  ratio = 'wide',
  className = '',
  motion = true,
  reveal = 'lift',
}: PhotoFigureProps) {
  const ref = useRef<HTMLElement>(null)
  const isPending = pending || !src || isPlaceholder(src)
  const animated = motion && !isPending

  useEffect(() => {
    const el = ref.current
    if (!el || !animated) return
    if (quality.reducedMotion) {
      el.style.setProperty('--rv', '1')
      el.style.setProperty('--rvs', '1')
      el.style.setProperty('--rvp', '0.5')
      return
    }
    return registerScrollMotion(el, { from: 0.15, to: 0.65 })
  }, [animated])

  return (
    <figure
      ref={ref}
      className={`photo-figure photo-figure--${ratio} ${animated ? `mt mt-photo mt-photo--${reveal}` : ''} ${className}`}
    >
      <div className="photo-frame">
        {isPending ? (
          <div className="photo-pending" role="img" aria-label={alt}>
            <svg viewBox="0 0 200 120" aria-hidden="true">
              <defs>
                <linearGradient id="phbg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#0b1b31" />
                  <stop offset="1" stopColor="#061426" />
                </linearGradient>
              </defs>
              <rect width="200" height="120" fill="url(#phbg)" />
              <line x1="20" y1="100" x2="180" y2="100" stroke="#1e3450" strokeWidth="2" />
              <g transform="translate(100 70) rotate(45)" stroke="#f6b73c" strokeWidth="3" fill="none">
                <path d="M 14 18 L 0 0 Q 0 -12 -14 -14" strokeLinecap="round" />
                <path d="M -14 -14 Q -2 -18 0 -22 Q 4 -18 14 -14" strokeLinecap="round" fill="#f6b73c" fillOpacity="0.4" />
              </g>
              <circle cx="34" cy="34" r="1.4" fill="#9fb3cc" />
              <circle cx="66" cy="18" r="1" fill="#9fb3cc" />
              <circle cx="158" cy="26" r="1.2" fill="#9fb3cc" />
              <circle cx="180" cy="60" r="0.9" fill="#9fb3cc" />
              <circle cx="150" cy="86" r="1.1" fill="#9fb3cc" />
            </svg>
            <span className="photo-pending__tag">Foto aguardando arquivo real</span>
          </div>
        ) : (
          <img src={src} alt={alt} loading="lazy" decoding="async" />
        )}
      </div>
    </figure>
  )
}