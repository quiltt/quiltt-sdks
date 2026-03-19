import React from 'react'
import { Platform } from 'react-native'

import { getSDKAgent as coreGetSDKAgent } from '@quiltt/core/utils'

/**
 * Gets the React version from the runtime
 */
export const getReactVersion = (): string => {
  return React.version || 'unknown'
}

/**
 * Gets the React Native version from Platform constants
 */
export const getReactNativeVersion = (): string => {
  try {
    const rnVersion = Platform.constants?.reactNativeVersion
    if (rnVersion) {
      return `${rnVersion.major}.${rnVersion.minor}.${rnVersion.patch}`
    }
  } catch (error) {
    console.warn('Failed to get React Native version:', error)
  }
  return 'unknown'
}

/**
 * Gets OS information (platform and version)
 */
export const getOSInfo = (): string => {
  try {
    const os = Platform.OS // 'ios' or 'android'
    const osVersion = Platform.Version // string (iOS) or number (Android)

    // Map platform names to correct capitalization
    const platformNames: Record<string, string> = {
      ios: 'iOS',
      android: 'Android',
    }
    const osName = platformNames[os] || 'Unknown'

    return `${osName}/${osVersion}`
  } catch (error) {
    console.warn('Failed to get OS info:', error)
    return 'Unknown/Unknown'
  }
}

/**
 * Gets device model information
 */
export const getDeviceModel = async (): Promise<string> => {
  try {
    const constants = Platform.constants as Record<string, unknown> | undefined
    const model = constants?.Model ?? constants?.model

    if (typeof model === 'string' && model.trim().length > 0) {
      return model.trim()
    }

    return 'Unknown'
  } catch (error) {
    console.warn('Failed to get device model:', error)
    return 'Unknown'
  }
}

/**
 * Generates platform information string for React Native
 * Format: React/<version>; ReactNative/<version>; <OS>/<version>; <device-model>
 */
export const getPlatformInfo = async (): Promise<string> => {
  const reactVersion = getReactVersion()
  const rnVersion = getReactNativeVersion()
  const osInfo = getOSInfo()
  const deviceModel = await getDeviceModel()

  return `React/${reactVersion}; ReactNative/${rnVersion}; ${osInfo}; ${deviceModel}`
}

/**
 * Synchronously generates platform information string for React Native
 * Format: React/<version>; ReactNative/<version>; <OS>/<version>; <device-model>
 */
export const getPlatformInfoSync = (): string => {
  const reactVersion = getReactVersion()
  const rnVersion = getReactNativeVersion()
  const osInfo = getOSInfo()
  const constants = Platform.constants as Record<string, unknown> | undefined
  const model = constants?.Model ?? constants?.model
  const deviceModel =
    typeof model === 'string' && model.trim().length > 0 ? model.trim() : 'Unknown'

  return `React/${reactVersion}; ReactNative/${rnVersion}; ${osInfo}; ${deviceModel}`
}

/**
 * Generates Quiltt-SDK-Agent string for React Native SDK
 * Format: Quiltt/<sdk-version> (React/<version>; ReactNative/<version>; <OS>/<version>; <device-model>)
 */
export const getSDKAgent = async (sdkVersion: string): Promise<string> => {
  const platformInfo = await getPlatformInfo()
  return coreGetSDKAgent(sdkVersion, platformInfo)
}
