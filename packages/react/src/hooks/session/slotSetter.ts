import type { SessionSlotSetter, SetSession } from '@/hooks/useSession'

/**
 * Whether a setter reports the slot it writes, so a controller can guard that slot.
 *
 * Not part of a package's public surface: it exists for the session hooks to share.
 */
export const isSlotSetter = (setter: SetSession): setter is SessionSlotSetter =>
  'storageKey' in setter
