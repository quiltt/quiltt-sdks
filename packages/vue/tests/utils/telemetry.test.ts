import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@quiltt/core/utils', () => ({
  getBrowserInfo: vi.fn(() => 'MockBrowser/1.0'),
  getSDKAgent: vi.fn(
    (sdkVersion: string, platformInfo: string) => `Quiltt/${sdkVersion} (${platformInfo})`
  ),
}))

import { getSDKAgent as coreGetSDKAgent } from '@quiltt/core/utils'

import { getCapacitorInfo, getPlatformInfo, getSDKAgent, getVueVersion } from '@/utils/telemetry'

afterEach(() => {
  delete window.Capacitor
  vi.clearAllMocks()
})

describe('vue telemetry utils', () => {
  it('returns null when not on native Capacitor platform', () => {
    window.Capacitor = {
      isNativePlatform: () => false,
      getPlatform: () => 'ios',
    }

    expect(getCapacitorInfo()).toBeNull()
  })

  it('returns null when Capacitor is not present', () => {
    delete window.Capacitor

    expect(getCapacitorInfo()).toBeNull()
  })

  it('returns null when Capacitor exposes no native check', () => {
    window.Capacitor = {} as unknown as Window['Capacitor']

    expect(getCapacitorInfo()).toBeNull()
  })

  it('maps known Capacitor platforms with correct capitalization', () => {
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => 'ios',
    }

    expect(getCapacitorInfo()).toBe('Capacitor/iOS')

    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => 'android',
    }

    expect(getCapacitorInfo()).toBe('Capacitor/Android')
  })

  it('falls back to raw platform name when platform is unknown', () => {
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => 'desktop',
    }

    expect(getCapacitorInfo()).toBe('Capacitor/desktop')
  })

  it('handles missing getPlatform and runtime errors gracefully', () => {
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: undefined as unknown as () => string,
    }

    expect(getCapacitorInfo()).toBe('Capacitor/native')

    window.Capacitor = {
      isNativePlatform: () => {
        throw new Error('boom')
      },
      getPlatform: () => 'ios',
    }

    expect(getCapacitorInfo()).toBeNull()
  })

  it('returns null when window is unavailable', () => {
    const originalWindow = globalThis.window

    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      configurable: true,
    })

    expect(getCapacitorInfo()).toBeNull()

    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
    })
  })

  it('builds platform info with and without Capacitor', () => {
    delete window.Capacitor
    expect(getPlatformInfo()).toBe(`Vue/${getVueVersion()}; MockBrowser/1.0`)

    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => 'web',
    }

    expect(getPlatformInfo()).toBe(`Vue/${getVueVersion()}; Capacitor/Web; MockBrowser/1.0`)
  })

  it('builds user-agent string using core helper', () => {
    const value = getSDKAgent('5.0.3')

    expect(value).toContain('Quiltt/5.0.3')
    expect(coreGetSDKAgent).toHaveBeenCalledWith('5.0.3', expect.stringContaining('Vue/'))
  })
})
