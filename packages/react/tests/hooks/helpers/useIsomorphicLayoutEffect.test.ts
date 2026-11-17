import { useEffect, useLayoutEffect } from 'react'

import { describe, expect, it, vi } from 'vitest'

describe('useIsomorphicLayoutEffect', () => {
  it('uses the layout effect in the browser', async () => {
    vi.resetModules()

    const { useIsomorphicLayoutEffect } = await import('@/hooks/helpers/useIsomorphicLayoutEffect')

    expect(useIsomorphicLayoutEffect).toBe(useLayoutEffect)
  })

  it('falls back to useEffect when there is no window', async () => {
    vi.resetModules()
    vi.stubGlobal('window', undefined)

    const { useIsomorphicLayoutEffect } = await import('@/hooks/helpers/useIsomorphicLayoutEffect')

    vi.unstubAllGlobals()

    expect(useIsomorphicLayoutEffect).toBe(useEffect)
  })
})
