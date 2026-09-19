import { isPlaceholder } from '../../utils/placeholders'

/**
 * Renders real content normally and clearly marks anything that is still a
 * TODO placeholder — no invented facts ever masquerade as truth on screen.
 */
export function PlaceholderText({ children }: { children: string }) {
  if (!isPlaceholder(children)) return <>{children}</>
  return (
    <span className="pending-content" role="note">
      [Conteúdo real pendente — revise src/data/project.ts]
    </span>
  )
}