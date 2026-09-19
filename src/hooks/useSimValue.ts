import { useEffect, useRef, useState } from 'react'

/**
 * Subscribes a DOM component to a value read from the mutable `sim` store.
 * Re-renders only happen when the visible value actually changes (epsilon
 * with numbers, strict identity otherwise).
 */
export function useSimValue<T>(select: () => T, epsilon = 0): T {
  const [value, setValue] = useState<T>(select)
  const selectRef = useRef(select)
  selectRef.current = select

  useEffect(() => {
    let raf = 0
    let last = selectRef.current()
    const loop = () => {
      const current = selectRef.current()
      const changed =
        epsilon > 0
          ? Math.abs(Number(current) - Number(last)) >= epsilon
          : !Object.is(current, last)
      if (changed) {
        last = current
        setValue(current)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [epsilon])

  return value
}