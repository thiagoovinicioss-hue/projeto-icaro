import { useEffect, useRef, useState } from 'react'

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export function CopyPixButton({ label, value, doneLabel, feedbackMs = 1800 }: { label: string; value: string; doneLabel: string; feedbackMs?: number }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  const onClick = async () => {
    const ok = await copyText(value)
    if (ok) {
      setCopied(true)
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), feedbackMs)
    }
  }

  return (
    <button type="button" className={`btn btn--gold${copied ? ' is-copied' : ''}`} onClick={onClick} aria-live="polite">
      {copied ? doneLabel : label}
    </button>
  )
}