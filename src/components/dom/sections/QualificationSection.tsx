import { useEffect, useRef } from 'react'
import { registerScrollMotion } from '../../../utils/scrollMotion'
import { quality } from '../../../utils/sim'
import type { Chapter } from '../../../story/chapters'
import { project } from '../../../data/project'
import { isPlaceholder } from '../../../utils/placeholders'
import { PhotoFigure } from '../PhotoFigure'
import { PlaceholderText } from '../PlaceholderText'
import { MotionTitle } from '../motion/MotionTitle'

function LaunchPhoto() {
  const photos = project.photos.launches
  const wide = photos.find((p) => p.ratio === 'wide') ?? photos[0]
  const rest = photos.filter((p) => p !== wide)

  if (photos.length === 0) {
    return (
      <PhotoFigure pending alt="Fotografia do lançamento da etapa anterior" caption="Nosso lançamento — foto a ser compartilhada" />
    )
  }

  return (
    <>
      <PhotoFigure
        src={wide.src}
        alt={wide.alt}
        caption={wide.caption}
        pending={wide.placeholder}
        ratio="wide"
        reveal="clip"
      />
      {rest.length > 0 && (
        <div className="photo-strip">
          {rest.map((p) => (
            <PhotoFigure
              key={p.src}
              src={p.src}
              alt={p.alt}
              caption={p.caption}
              pending={p.placeholder}
              ratio={p.ratio ?? 'portrait'}
              reveal="clip"
            />
          ))}
        </div>
      )}
    </>
  )
}

export function QualificationSection({ chapter }: { chapter: Chapter }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (quality.reducedMotion) {
      el.style.setProperty('--rv', '1')
      el.style.setProperty('--rvs', '1')
      return
    }
    return registerScrollMotion(el, { to: 0.6 })
  }, [])

  return (
    <div ref={ref} className="classified-block mt">
      <p className="kicker kicker--gold mt-kicker">{chapter.kicker}</p>
      <MotionTitle as="h2" id={`title-${chapter.id}`} className="classified-word" fromT={0.385} toT={0.5}>
        {chapter.title}
      </MotionTitle>
      <p className="chapter-body mt-body">
        <PlaceholderText>{project.qualification.context}</PlaceholderText>
      </p>
      {isPlaceholder(project.qualification.dateLabel) ? (
        <span className="pending-content mt-body" style={{ marginTop: '1.5rem' }}>data da classificação a publicar</span>
      ) : (
        <p className="chapter-date mt-body">{project.qualification.dateLabel}</p>
      )}
      <div className="launch-photos">
        <LaunchPhoto />
      </div>
    </div>
  )
}