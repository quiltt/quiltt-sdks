import React from 'react'
import { Platform } from 'react-native'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getDeviceModel,
  getOSInfo,
  getPlatformInfo,
  getPlatformInfoSync,
  getReactNativeVersion,
  getReactVersion,
  getSDKAgent,
} from '@/utils/telemetry'

describe('React Native Telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getReactVersion', () => {
    it('should return React version from React.version', () => {
      const version = getReactVersion()
      expect(version).toBe(React.version)
    })

    it('should return actual React version', () => {
      const version = getReactVersion()
      expect(version).toMatch(/^\d+\.\d+\.\d+/)
    })
  })

  describe('getReactNativeVersion', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should return React Native version from Platform.constants', () => {
      // Mock Platform.constants
      Object.defineProperty(Platform, 'constants', {
        value: {
          reactNativeVersion: {
            major: 0,
            minor: 73,
            patch: 0,
          },
        },
        configurable: true,
      })

      const version = getReactNativeVersion()
      expect(version).toBe('0.73.0')
    })

    it('should return unknown if reactNativeVersion is not available', () => {
      // Mock Platform.constants without reactNativeVersion
      Object.defineProperty(Platform, 'constants', {
        value: {},
        configurable: true,
      })

      const version = getReactNativeVersion()
      expect(version).toBe('unknown')
    })

    it('should handle errors gracefully', () => {
      // Mock Platform.constants to throw
      Object.defineProperty(Platform, 'constants', {
        get() {
          throw new Error('Mock error')
        },
        configurable: true,
      })
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const version = getReactNativeVersion()
      expect(version).toBe('unknown')
      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })
  })

  describe('getOSInfo', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should return iOS version info', () => {
      vi.spyOn(Platform, 'OS', 'get').mockReturnValue('ios')
      vi.spyOn(Platform, 'Version', 'get').mockReturnValue('17.0')

      const osInfo = getOSInfo()
      expect(osInfo).toBe('iOS/17.0')
    })

    it('should return Android version info', () => {
      vi.spyOn(Platform, 'OS', 'get').mockReturnValue('android')
      vi.spyOn(Platform, 'Version', 'get').mockReturnValue(33)

      const osInfo = getOSInfo()
      expect(osInfo).toBe('Android/33')
    })

    it('should handle errors gracefully', () => {
      vi.spyOn(Platform, 'OS', 'get').mockImplementation(() => {
        throw new Error('Mock error')
      })
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const osInfo = getOSInfo()
      expect(osInfo).toBe('Unknown/Unknown')
      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })
  })

  describe('getDeviceModel', () => {
    it('should return device model from Platform.constants.Model', async () => {
      Object.defineProperty(Platform, 'constants', {
        value: { Model: 'iPhone14,2' },
        configurable: true,
      })

      const model = await getDeviceModel()
      expect(model).toBe('iPhone14,2')
    })

    it('should return Unknown if model is missing or empty', async () => {
      Object.defineProperty(Platform, 'constants', {
        value: { Model: '' },
        configurable: true,
      })

      const model = await getDeviceModel()
      expect(model).toBe('Unknown')
    })

    it('should handle errors gracefully', async () => {
      Object.defineProperty(Platform, 'constants', {
        get() {
          throw new Error('Mock error')
        },
        configurable: true,
      })
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const model = await getDeviceModel()
      expect(model).toBe('Unknown')
      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })
  })

  describe('getPlatformInfo', () => {
    beforeEach(() => {
      vi.clearAllMocks()

      // Mock Platform properties
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        configurable: true,
      })
      Object.defineProperty(Platform, 'Version', {
        value: '17.0',
        configurable: true,
      })
      Object.defineProperty(Platform, 'constants', {
        value: {
          reactNativeVersion: {
            major: 0,
            minor: 73,
            patch: 0,
          },
          Model: 'iPhone14,2',
        },
        configurable: true,
      })
    })

    it('should combine all platform information', async () => {
      const platformInfo = await getPlatformInfo()
      // Device model comes from mocked DeviceInfo
      expect(platformInfo).toMatch(
        /^React\/\d+\.\d+\.\d+; ReactNative\/0\.73\.0; iOS\/17\.0; iPhone14,2$/
      )
    })

    it('should handle Unknown values gracefully', async () => {
      Object.defineProperty(Platform, 'constants', {
        value: {},
        configurable: true,
      })

      const platformInfo = await getPlatformInfo()
      expect(platformInfo).toMatch(
        /^React\/\d+\.\d+\.\d+; ReactNative\/unknown; iOS\/17\.0; Unknown$/
      )
    })
  })

  describe('getPlatformInfoSync', () => {
    beforeEach(() => {
      vi.clearAllMocks()

      // Mock Platform properties
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        configurable: true,
      })
      Object.defineProperty(Platform, 'Version', {
        value: '17.0',
        configurable: true,
      })
      Object.defineProperty(Platform, 'constants', {
        value: {
          reactNativeVersion: {
            major: 0,
            minor: 73,
            patch: 0,
          },
          Model: 'iPhone14,2',
        },
        configurable: true,
      })
    })

    it('should combine platform information synchronously with device model', () => {
      const platformInfo = getPlatformInfoSync()
      expect(platformInfo).toMatch(
        /^React\/\d+\.\d+\.\d+; ReactNative\/0\.73\.0; iOS\/17\.0; iPhone14,2$/
      )
    })

    it('should work for Android', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        configurable: true,
      })
      Object.defineProperty(Platform, 'Version', {
        value: 33,
        configurable: true,
      })
      Object.defineProperty(Platform, 'constants', {
        value: {
          reactNativeVersion: {
            major: 0,
            minor: 73,
            patch: 0,
          },
          Model: 'SM-G998B',
        },
        configurable: true,
      })

      const platformInfo = getPlatformInfoSync()
      expect(platformInfo).toMatch(
        /^React\/\d+\.\d+\.\d+; ReactNative\/0\.73\.0; Android\/33; SM-G998B$/
      )
    })

    it('should handle missing React Native version', () => {
      Object.defineProperty(Platform, 'constants', {
        value: {},
        configurable: true,
      })

      const platformInfo = getPlatformInfoSync()
      expect(platformInfo).toMatch(
        /^React\/\d+\.\d+\.\d+; ReactNative\/unknown; iOS\/17\.0; Unknown$/
      )
    })
  })

  describe('getSDKAgent', () => {
    beforeEach(() => {
      vi.clearAllMocks()

      // Mock Platform properties
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        configurable: true,
      })
      Object.defineProperty(Platform, 'Version', {
        value: '17.0',
        configurable: true,
      })
      Object.defineProperty(Platform, 'constants', {
        value: {
          reactNativeVersion: {
            major: 0,
            minor: 73,
            patch: 0,
          },
          Model: 'iPhone14,2',
        },
        configurable: true,
      })
    })

    it('should generate correct Quiltt-SDK-Agent string for iOS', async () => {
      const sdkAgent = await getSDKAgent('4.5.1')
      // Device model comes from mocked DeviceInfo
      expect(sdkAgent).toMatch(
        /^Quiltt\/4\.5\.1 \(React\/\d+\.\d+\.\d+; ReactNative\/0\.73\.0; iOS\/17\.0; iPhone14,2\)$/
      )
    })

    it('should generate correct Quiltt-SDK-Agent string for Android', async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        configurable: true,
      })
      Object.defineProperty(Platform, 'Version', {
        value: 33,
        configurable: true,
      })
      Object.defineProperty(Platform, 'constants', {
        value: {
          reactNativeVersion: {
            major: 0,
            minor: 73,
            patch: 0,
          },
          Model: 'SM-G998B',
        },
        configurable: true,
      })

      const sdkAgent = await getSDKAgent('4.5.1')
      expect(sdkAgent).toMatch(
        /^Quiltt\/4\.5\.1 \(React\/\d+\.\d+\.\d+; ReactNative\/0\.73\.0; Android\/33; SM-G998B\)$/
      )
    })

    it('should handle different SDK versions', async () => {
      const sdkAgent = await getSDKAgent('5.0.0-beta.1')
      expect(sdkAgent).toMatch(
        /^Quiltt\/5\.0\.0-beta\.1 \(React\/\d+\.\d+\.\d+; ReactNative\/0\.73\.0; iOS\/17\.0; iPhone14,2\)$/
      )
    })

    it('should handle device model errors gracefully', async () => {
      Object.defineProperty(Platform, 'constants', {
        get() {
          throw new Error('Mock error')
        },
        configurable: true,
      })
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      const sdkAgent = await getSDKAgent('4.5.1')
      expect(sdkAgent).toMatch(
        /^Quiltt\/4\.5\.1 \(React\/\d+\.\d+\.\d+; ReactNative\/unknown; iOS\/17\.0; Unknown\)$/
      )
    })
  })
})
