/**
 * Countdown read from world time:
 *   t in [0.90, 0.945]   -> "3"
 *   t in [0.945, 0.975]  -> "2"
 *   t in [0.975, 0.992]  -> "1"
 *   t >= 0.992           -> "0" (lançamento)
 */
export function countdownAt(t: number): string | null {
  if (t < 0.9) return null
  if (t < 0.945) return '3'
  if (t < 0.975) return '2'
  if (t < 0.992) return '1'
  return '0'
}