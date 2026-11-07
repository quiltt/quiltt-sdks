import { describe, expect, it, vi } from 'vitest'

import type { SessionController, SessionTokenSource, SetToken } from '@/index'
import * as VueExports from '@/index'
import {
  AuthAPI,
  ConnectorsAPI,
  createSessionController,
  GlobalStorage,
  QuilttButton,
  QuilttContainer,
  QuilttPlugin,
  QuilttSessionKey,
  SESSION_STORAGE_KEY,
  sharedSessionTokenSource,
  useQuilttConnector,
  useQuilttInstitutions,
  useQuilttResolvable,
  useQuilttSession,
  useQuilttSettings,
  useSession,
  useStorage,
} from '@/index'

describe('@quiltt/vue exports', () => {
  it.each([
    ['AuthAPI', AuthAPI],
    ['ConnectorsAPI', ConnectorsAPI],
  ])('re-exports %s from @quiltt/core', (_name, exported) => {
    expect(exported).toBeDefined()
    expect(typeof exported).toBe('function')
  })

  it('re-exports the session helpers from @quiltt/core', () => {
    GlobalStorage.set(SESSION_STORAGE_KEY, null)

    const set = vi.fn<SetToken>((token) => GlobalStorage.set(SESSION_STORAGE_KEY, token))
    const controller: SessionController = createSessionController(set)
    const source: SessionTokenSource = sharedSessionTokenSource

    expect(SESSION_STORAGE_KEY).toBe('session')
    expect(typeof source.read).toBe('function')

    // The real implementation, not a re-exported stub: adopting an unchanged slot writes through.
    expect(controller.adopt('session-token', controller.snapshot())).toBe(true)
    expect(set).toHaveBeenCalledWith('session-token')
  })

  it.each([
    ['QuilttPlugin', QuilttPlugin],
    ['QuilttSessionKey', QuilttSessionKey],
    ['QuilttButton', QuilttButton],
    ['QuilttContainer', QuilttContainer],
  ])('exports Vue module %s', (_name, exported) => {
    expect(exported).toBeDefined()
  })

  it.each([
    ['useQuilttSession', useQuilttSession],
    ['useQuilttConnector', useQuilttConnector],
    ['useQuilttInstitutions', useQuilttInstitutions],
    ['useQuilttResolvable', useQuilttResolvable],
    ['useQuilttSettings', useQuilttSettings],
    ['useSession', useSession],
    ['useStorage', useStorage],
  ])('exports composable %s', (_name, exported) => {
    expect(exported).toBeDefined()
    expect(typeof exported).toBe('function')
  })

  it('exposes subpath imports', async () => {
    const [composables, components, plugin] = await Promise.all([
      import('@/composables/index'),
      import('@/components/index'),
      import('@/plugin/index'),
    ])

    expect(composables.useQuilttSession).toBeDefined()
    expect(components.QuilttButton).toBeDefined()
    expect(plugin.QuilttPlugin).toBeDefined()
  })

  it('keeps main package surface importable as object', () => {
    expect(VueExports).toBeDefined()
    expect(typeof VueExports).toBe('object')
  })
})
