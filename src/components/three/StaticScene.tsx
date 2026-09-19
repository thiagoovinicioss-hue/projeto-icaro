import { useMemo } from 'react'

/**
 * Pure-CSS fallback shown when WebGL is unavailable.
 * The story keeps working: the world is just a composed poster.
 */
export function StaticScene() {
  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 0.5 + Math.random() * 1.6,
        delay: Math.random() * 4,
      })),
    [],
  )

  return (
    <div className="static-world" aria-hidden="true">
      <div className="static-stars">
        {stars.map((s, i) => (
          <span
            key={i}
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>
      <div className="static-sun" />
      <div className="static-rocket">
        <div className="static-rocket-nose" />
        <div className="static-rocket-body">
          <div className="static-rocket-water" />
          <div className="static-rocket-tape" />
        </div>
        <div className="static-rocket-fin fin-a" />
        <div className="static-rocket-fin fin-b" />
        <div className="static-rocket-jet" />
      </div>
      <div className="static-earth" />
    </div>
  )
}