import type { ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  variant?: 'up' | 'left' | 'right' | 'fade' | 'mask'
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'article' | 'li' | 'figure'
}

export function Reveal({
  children,
  variant = 'up',
  delay = 0,
  className = '',
  as = 'div',
}: RevealProps) {
  const Tag = as
  return (
    <Tag
      className={`reveal reveal--${variant} is-visible ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}