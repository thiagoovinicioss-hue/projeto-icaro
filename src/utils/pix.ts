import { isPlaceholder } from './placeholders'

/** A Pix "copia e cola" payload only exists once it is a long static string. */
export const MIN_PIX_PAYLOAD_LENGTH = 40

export function hasRealPixPayload(payload: string | null): payload is string {
  return Boolean(payload && !isPlaceholder(payload) && payload.trim().length >= MIN_PIX_PAYLOAD_LENGTH)
}

/** Value that should be copied for a Pix donation (payload takes priority over the raw key). */
export function pixCopyValue(payload: string | null, key: string): string {
  return hasRealPixPayload(payload) ? payload : key
}