import { createApp, ref } from 'vue'

import { describe, expect, it } from 'vitest'

import { useQuilttSettings } from '@/composables/useQuilttSettings'
import { QuilttClientIdKey, QuilttHeadersKey } from '@/plugin/keys'

const mountComposable = <T>(factory: () => T, provide?: Array<[symbol, unknown]>) => {
  let result!: T
  const root = document.createElement('div')
  document.body.appendChild(root)

  const app = createApp({
    setup() {
      result = factory()
      return () => null
    },
  })

  provide?.forEach(([key, value]) => {
    app.provide(key, value)
  })

  app.mount(root)

  return {
    result,
    unmount: () => {
      app.unmount()
      root.remove()
    },
  }
}

describe('useQuilttSettings', () => {
  it('reads clientId from injected plugin state', () => {
    const { result, unmount } = mountComposable(
      () => useQuilttSettings(),
      [[QuilttClientIdKey as unknown as symbol, ref('cid_test')]]
    )

    expect(result.clientId.value).toBe('cid_test')

    unmount()
  })

  it('returns undefined clientId when plugin state is unavailable', () => {
    const { result, unmount } = mountComposable(() => useQuilttSettings())

    expect(result.clientId.value).toBeUndefined()

    unmount()
  })

  it('reads headers from injected plugin state', () => {
    const { result, unmount } = mountComposable(
      () => useQuilttSettings(),
      [[QuilttHeadersKey as unknown as symbol, ref({ 'X-Test': 'value' })]]
    )

    expect(result.headers.value).toEqual({ 'X-Test': 'value' })

    unmount()
  })

  it('returns undefined headers when plugin state is unavailable', () => {
    const { result, unmount } = mountComposable(() => useQuilttSettings())

    expect(result.headers.value).toBeUndefined()

    unmount()
  })
})
