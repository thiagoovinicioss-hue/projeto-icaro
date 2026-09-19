import { Suspense, lazy, useEffect, useState } from 'react'
import { StaticScene } from './components/three/StaticScene'
import { Navbar } from './components/dom/Navbar'
import { Footer } from './components/dom/Footer'
import { StoryRail } from './components/dom/motion/StoryRail'
import { ChapterSection } from './components/dom/ChapterSection'
import { CHAPTERS } from './story/chapters'
import { useScrollConductor } from './hooks/useScrollConductor'
import { detectDeviceProfile } from './utils/motion'
import { initPointerParallax } from './utils/pointer'
import { quality, sim } from './utils/sim'
import { supportsWebGL } from './utils/webgl'

const EXPERIENCE_DISABLED = false

const ExperienceLazy = lazy(() =>
  import('./components/three/Experience').then((m) => ({ default: m.Experience })),
)

/** Capítulos que pedem pausa cinematográfica: reduzir o movimento ambiente. */
const CINEMATIC_PAUSE_KINDS = new Set(['qualification', 'goal'])

export function App() {
  useScrollConductor()

  const [webglAvailable, setWebglAvailable] = useState(true)

  useEffect(() => {
    document.documentElement.classList.add('app-mounted')
    const profile = detectDeviceProfile()
    if (profile.reducedMotion) quality.reducedMotion = true
    if (profile.quality === 'low') quality.post = false
    quality.dprCap = profile.dprCap
    quality.shadows = profile.shadows
    quality.particles = profile.particles
    const w = window.innerWidth
    quality.isMobile = profile.isMobile || w < 768
    quality.deviceTier = w < 768 ? 'mobile' : w < 1240 ? 'tablet' : 'desktop'
    setWebglAvailable(supportsWebGL())
    return initPointerParallax()
  }, [])

  useEffect(() => {
    const watch = () => {
      const kind = CHAPTERS[sim.chapterIndex]?.kind
      if (kind && CINEMATIC_PAUSE_KINDS.has(kind)) {
        document.documentElement.dataset.cinePause = kind
      } else {
        delete document.documentElement.dataset.cinePause
      }
    }
    watch()
    const id = window.setInterval(watch, 100)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="shell">
      <div className="scene-layer" aria-hidden="true">
        {EXPERIENCE_DISABLED || !webglAvailable ? (
          <StaticScene />
        ) : (
          <Suspense fallback={<StaticScene />}>
            <ExperienceLazy />
          </Suspense>
        )}
      </div>

      <div className="ambient-layer" aria-hidden="true" />
      <div className="film-grain" aria-hidden="true" />

      <Navbar />

      <StoryRail />

      <main className="story" id="conteudo">
        {CHAPTERS.map((chapter, index) => (
          <ChapterSection key={chapter.id} chapter={chapter} index={index} />
        ))}
        <Footer />
      </main>
    </div>
  )
}