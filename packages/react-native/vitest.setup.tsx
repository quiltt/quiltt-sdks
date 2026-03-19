import * as React from 'react'

import { vi } from 'vitest'

// Setup global for React Native TurboModule before any imports
// This is required for React Native 0.76+ which uses feature flags via TurboModules
const mockFeatureFlags = {
  commonTestFlag: () => false,
  allowCollapsableChildren: () => true,
  allowRecursiveCommitsWithSynchronousMountOnAndroid: () => false,
  batchRenderingUpdatesInEventLoop: () => false,
  destroyFabricSurfacesInReactInstanceManager: () => false,
  enableBackgroundExecutor: () => false,
  enableCleanTextInputYogaNode: () => false,
  enableGranularShadowTreeStateReconciliation: () => false,
  enableMicrotasks: () => false,
  enablePropsUpdateReconciliationAndroid: () => false,
  enableSynchronousStateUpdates: () => false,
  enableUIConsistency: () => false,
  fetchImagesInViewPreallocation: () => false,
  fixIncorrectScrollViewStateUpdateOnAndroid: () => false,
  fixMappingOfEventPrioritiesBetweenFabricAndReact: () => false,
  fixMissedFabricStateUpdatesOnAndroid: () => false,
  forceBatchingMountItemsOnAndroid: () => false,
  fuseboxEnabledDebug: () => true,
  fuseboxEnabledRelease: () => false,
  lazyAnimationCallbacks: () => false,
  loadVectorDrawablesOnImages: () => false,
  setAndroidLayoutDirection: () => false,
  traceTurboModulePromiseRejectionsOnAndroid: () => false,
  useFabricInterop: () => false,
  useImmediateExecutorInAndroidBridgeless: () => false,
  useModernRuntimeScheduler: () => false,
  useNativeViewConfigsInBridgelessMode: () => false,
  useNewReactImageViewBackgroundDrawing: () => false,
  useRuntimeShadowNodeReferenceUpdate: () => false,
  useRuntimeShadowNodeReferenceUpdateOnLayout: () => false,
  useStateAlignmentMechanism: () => false,
  useTurboModuleInterop: () => false,
}

// Set up global TurboModuleRegistry mock before React Native loads
;(global as any).__turboModuleProxy = (name: string) => {
  if (name === 'NativeReactNativeFeatureFlagsCxx') {
    return mockFeatureFlags
  }
  if (name === 'DeviceInfo') {
    return {
      getConstants: () => ({
        Dimensions: {
          window: { width: 375, height: 667, scale: 2, fontScale: 1 },
          screen: { width: 375, height: 667, scale: 2, fontScale: 1 },
        },
        isIPhoneX_deprecated: false,
      }),
    }
  }
  // Return null for other TurboModules to avoid errors
  return null
}

// Mock react-native
const mockPlatform = {
  OS: 'ios',
  Version: '14.0',
  select: vi.fn((obj) => obj.ios),
}

const mockStyleSheet = {
  create: vi.fn((obj) => obj),
  hairlineWidth: 1,
  flatten: vi.fn((style) => style),
}

const mockLinking = {
  openURL: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  canOpenURL: vi.fn(),
  getInitialURL: vi.fn(),
}

vi.mock('react-native', () => ({
  ActivityIndicator: (props: any) => React.createElement('ActivityIndicator', props),
  Button: (props: any) => React.createElement('Button', props),
  Image: (props: any) => React.createElement('Image', props),
  Linking: {
    openURL: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    canOpenURL: vi.fn(),
    getInitialURL: vi.fn(),
  },
  NativeModules: {
    BlobModule: {
      BLOB_URI_SCHEME: 'content',
      BLOB_URI_HOST: 'localhost',
    },
  },
  Platform: {
    OS: 'ios',
    Version: '14.0',
    select: vi.fn((obj) => obj.ios),
  },
  Pressable: (props: any) => React.createElement('Pressable', props),
  SafeAreaView: (props: any) => React.createElement('SafeAreaView', props),
  StyleSheet: {
    create: vi.fn((obj) => obj),
    hairlineWidth: 1,
    flatten: vi.fn((style) => style),
  },
  Text: (props: any) => React.createElement('Text', props),
  View: (props: any) => React.createElement('View', props),
}))

vi.mock('react-native-webview', () => ({
  WebView: (props: any) => React.createElement('WebView', props),
}))

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: (props: any) => React.createElement('SafeAreaView', props),
}))

// Mock react-native-url-polyfill to avoid module resolution issues
vi.mock('react-native-url-polyfill', () => ({
  // Export URL and URLSearchParams from global
  URL: globalThis.URL,
  URLSearchParams: globalThis.URLSearchParams,
}))

// Export mocks for individual test usage
export { mockLinking, mockPlatform, mockStyleSheet }
