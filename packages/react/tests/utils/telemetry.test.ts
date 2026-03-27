import React from 'react'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getBrowserInfo,
  getCapacitorInfo,
  getPlatformInfo,
  getReactVersion,
  getSDKAgent,
} from '@/utils/telemetry'

describe('React Telemetry', () => {
  describe('getReactVersion', () => {
    it('should return React version from React.version', () => {
      const version = getReactVersion()
      expect(version).toBe(React.version)
    })

    it('should return actual React version', () => {
      const version = getReactVersion()
      expect(version).toMatch(/^\d+\.\d+\.\d+/)
    })

    it('returns unknown when React.version is falsy', () => {
      const original = React.version
      Object.defineProperty(React, 'version', { value: '', writable: true, configurable: true })
      expect(getReactVersion()).toBe('unknown')
      Object.defineProperty(React, 'version', {
        value: original,
        writable: true,
        configurable: true,
      })
    })
  })

  describe('getBrowserInfo', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should detect Chrome browser', () => {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        writable: true,
        configurable: true,
      })

      const browserInfo = getBrowserInfo()
      expect(browserInfo).toBe('Chrome/120')
    })

    it('should detect Safari browser', () => {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        writable: true,
        configurable: true,
      })

      const browserInfo = getBrowserInfo()
      expect(browserInfo).toBe('Safari/17')
    })

    it('should detect Firefox browser', () => {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
        writable: true,
        configurable: true,
      })

      const browserInfo = getBrowserInfo()
      expect(browserInfo).toBe('Firefox/121')
    })

    it('should detect Edge browser', () => {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        writable: true,
        configurable: true,
      })

      const browserInfo = getBrowserInfo()
      expect(browserInfo).toBe('Edge/120')
    })

    it('should return Unknown for unrecognized browsers', () => {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: 'Some Custom Browser/1.0',
        writable: true,
        configurable: true,
      })

      const browserInfo = getBrowserInfo()
      expect(browserInfo).toBe('Unknown')
    })
  })

  describe('getPlatformInfo', () => {
    it('should combine React version and browser info', () => {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        writable: true,
        configurable: true,
      })

      const platformInfo = getPlatformInfo()
      expect(platformInfo).toMatch(/^React\/\d+\.\d+\.\d+; Chrome\/120$/)
    })

    it('should handle Unknown browser', () => {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      const platformInfo = getPlatformInfo()
      expect(platformInfo).toMatch(/^React\/\d+\.\d+\.\d+; Unknown$/)
    })

    it('should include Capacitor platform details when in native environment', () => {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        writable: true,
        configurable: true,
      })

      window.Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'ios',
      }

      const platformInfo = getPlatformInfo()
      expect(platformInfo).toMatch(/^React\/\d+\.\d+\.\d+; Capacitor\/iOS; Chrome\/120$/)

      delete window.Capacitor
    })
  })

  describe('getCapacitorInfo', () => {
    it('should return null when not in native environment', () => {
      window.Capacitor = {
        isNativePlatform: () => false,
        getPlatform: () => 'ios',
      }

      expect(getCapacitorInfo()).toBeNull()
      delete window.Capacitor
    })

    it('should map known platforms and fallback to native when getPlatform is missing', () => {
      window.Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
      }
      expect(getCapacitorInfo()).toBe('Capacitor/Android')

      window.Capacitor = {
        isNativePlatform: () => true,
        getPlatform: undefined as unknown as () => string,
      }
      expect(getCapacitorInfo()).toBe('Capacitor/native')

      window.Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'desktop',
      }
      expect(getCapacitorInfo()).toBe('Capacitor/desktop')

      delete window.Capacitor
    })

    it('should return null when Capacitor APIs throw', () => {
      window.Capacitor = {
        isNativePlatform: () => {
          throw new Error('boom')
        },
        getPlatform: () => 'ios',
      }

      expect(getCapacitorInfo()).toBeNull()
      delete window.Capacitor
    })

    it('should return null when window is unavailable', () => {
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
  })

  describe('getSDKAgent', () => {
    beforeEach(() => {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        writable: true,
        configurable: true,
      })
    })

    it('should generate correct SDK Agent string', () => {
      const sdkAgent = getSDKAgent('4.5.1')
      expect(sdkAgent).toMatch(/^Quiltt\/4\.5\.1 \(React\/\d+\.\d+\.\d+; Chrome\/120\)$/)
    })

    it('should handle different SDK versions', () => {
      const sdkAgent = getSDKAgent('5.0.0-beta.1')
      expect(sdkAgent).toMatch(/^Quiltt\/5\.0\.0-beta\.1 \(React\/\d+\.\d+\.\d+; Chrome\/120\)$/)
    })

    it('should work with Safari browser', () => {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        writable: true,
        configurable: true,
      })

      const sdkAgent = getSDKAgent('4.5.1')
      expect(sdkAgent).toMatch(/^Quiltt\/4\.5\.1 \(React\/\d+\.\d+\.\d+; Safari\/17\)$/)
    })
  })
})
