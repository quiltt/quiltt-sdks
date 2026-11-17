import { beforeEach, describe, expect, it, vi } from 'vitest'

import { extractVersionNumber, getBrowserInfo, getSDKAgent } from '@/utils/telemetry'

describe('Core Telemetry', () => {
  describe('extractVersionNumber', () => {
    it('should extract version from formatted string', () => {
      expect(extractVersionNumber('@quiltt/core: v4.5.1')).toBe('4.5.1')
    })

    it('should extract version from simple v-prefixed string', () => {
      expect(extractVersionNumber('v1.2.3')).toBe('1.2.3')
    })

    it('should extract version and ignore pre-release tags', () => {
      expect(extractVersionNumber('v4.5.1-beta')).toBe('4.5.1')
      expect(extractVersionNumber('v4.5.1-alpha.1')).toBe('4.5.1')
      expect(extractVersionNumber('v4.5.1-rc.2')).toBe('4.5.1')
    })

    it('should extract version and ignore build metadata', () => {
      expect(extractVersionNumber('v4.5.1+build.123')).toBe('4.5.1')
    })

    it('should return "unknown" when no v prefix found', () => {
      expect(extractVersionNumber('4.5.1')).toBe('unknown')
      expect(extractVersionNumber('@quiltt/core: 4.5.1')).toBe('unknown')
      expect(extractVersionNumber('no-version-here')).toBe('unknown')
    })

    it('should return "unknown" for empty string', () => {
      expect(extractVersionNumber('')).toBe('unknown')
    })

    it('should return "unknown" when version has less than 3 parts', () => {
      expect(extractVersionNumber('v1.2')).toBe('unknown')
      expect(extractVersionNumber('v1')).toBe('unknown')
      expect(extractVersionNumber('v')).toBe('unknown')
    })

    it('should return "unknown" when major version is non-numeric', () => {
      expect(extractVersionNumber('vx.2.3')).toBe('unknown')
      expect(extractVersionNumber('vabc.2.3')).toBe('unknown')
      expect(extractVersionNumber('v.2.3')).toBe('unknown')
    })

    it('should return "unknown" when minor version is non-numeric', () => {
      expect(extractVersionNumber('v1.x.3')).toBe('unknown')
      expect(extractVersionNumber('v1.def.3')).toBe('unknown')
      expect(extractVersionNumber('v1..3')).toBe('unknown')
    })

    it('should return "unknown" when patch version is non-numeric', () => {
      expect(extractVersionNumber('v1.2.x')).toBe('unknown')
      expect(extractVersionNumber('v1.2.ghi')).toBe('unknown')
      expect(extractVersionNumber('v1.2.')).toBe('unknown')
    })

    it('should return "unknown" when all parts are non-numeric', () => {
      expect(extractVersionNumber('vabc.def.ghi')).toBe('unknown')
    })
  })

  describe('getSDKAgent', () => {
    it('should generate correct Quiltt-SDK-Agent value', () => {
      const sdkAgent = getSDKAgent('4.5.1', 'React/19.2.3; Chrome/120')
      expect(sdkAgent).toBe('Quiltt/4.5.1 (React/19.2.3; Chrome/120)')
    })

    it('should handle version with different formats', () => {
      const sdkAgent = getSDKAgent('5.0.0-beta.1', 'Web')
      expect(sdkAgent).toBe('Quiltt/5.0.0-beta.1 (Web)')
    })

    it('should handle complex platform info', () => {
      const sdkAgent = getSDKAgent(
        '4.5.1',
        'React/19.2.3; ReactNative/0.73.0; iOS/17.0; iPhone14,2'
      )
      expect(sdkAgent).toBe('Quiltt/4.5.1 (React/19.2.3; ReactNative/0.73.0; iOS/17.0; iPhone14,2)')
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

    it('should report a version of Unknown when the browser token carries no number', () => {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: 'Mozilla/5.0 Edg/ Chrome/ Version/ Firefox/',
        writable: true,
        configurable: true,
      })

      expect(getBrowserInfo()).toBe('Edge/Unknown')

      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: 'Mozilla/5.0 Chrome/ Version/ Firefox/',
        writable: true,
        configurable: true,
      })

      expect(getBrowserInfo()).toBe('Chrome/Unknown')

      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: 'Mozilla/5.0 AppleWebKit/605.1.15 Version/ Safari/605.1.15',
        writable: true,
        configurable: true,
      })

      expect(getBrowserInfo()).toBe('Safari/Unknown')

      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: 'Mozilla/5.0 Gecko/20100101 Firefox/',
        writable: true,
        configurable: true,
      })

      expect(getBrowserInfo()).toBe('Firefox/Unknown')
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

    it('should return Unknown when navigator is undefined', () => {
      const originalNavigator = globalThis.navigator
      // @ts-expect-error - testing undefined navigator
      delete globalThis.navigator

      const browserInfo = getBrowserInfo()
      expect(browserInfo).toBe('Unknown')

      globalThis.navigator = originalNavigator
    })

    it('should return Unknown when userAgent is not available', () => {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      const browserInfo = getBrowserInfo()
      expect(browserInfo).toBe('Unknown')
    })
  })
})
