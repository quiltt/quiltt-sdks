import { useEffect, useRef } from 'react'
import { Linking, Platform, StyleSheet } from 'react-native'
import { router } from 'expo-router'

import type { ConnectorSDKCallbackMetadata, QuilttConnectorHandle } from '@quiltt/react-native'
import { QuilttConnector } from '@quiltt/react-native'

import { ThemedView } from '@/components/ThemedView'

const CONNECTOR_ID = process.env.EXPO_PUBLIC_CONNECTOR_ID
const APP_LAUNCHER_URL = process.env.EXPO_PUBLIC_APP_LAUNCHER_URL
const INSTITUTION_SEARCH_TERM = process.env.EXPO_PUBLIC_INSTITUTION_SEARCH_TERM

export default function ConnectorScreen() {
  const connectorRef = useRef<QuilttConnectorHandle>(null)

  const navigateBack = () => {
    router.canGoBack() ? router.back() : router.push('/(tabs)')
  }

  // Handle incoming deep links (OAuth callbacks)
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      console.log('Received deep link:', url)

      // Check if this is an OAuth callback URL
      // You can customize this check based on your OAuth redirect URL structure
      if (url && connectorRef.current) {
        // Forward the callback URL to the QuilttConnector
        connectorRef.current.handleOAuthCallback(url)
      }
    }

    // Listen for incoming links while the app is open
    const subscription = Linking.addEventListener('url', handleUrl)

    // Check if the app was opened with a URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl({ url })
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])

  console.log({ APP_LAUNCHER_URL })

  return (
    <ThemedView style={styles.container} testID="quiltt-connector">
      <QuilttConnector
        ref={connectorRef}
        connectorId={CONNECTOR_ID!}
        appLauncherUrl={APP_LAUNCHER_URL ?? 'https://example.com/callback'}
        institution={INSTITUTION_SEARCH_TERM}
        onExitSuccess={(metadata: ConnectorSDKCallbackMetadata) => {
          console.log(metadata.connectionId)
          navigateBack()
        }}
        onExitAbort={() => {
          navigateBack()
        }}
        onExitError={(metadata: ConnectorSDKCallbackMetadata) => {
          console.log(metadata.connectorId)
          navigateBack()
        }}
      />
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
    paddingBottom: Platform.OS === 'ios' ? 80 : 0,
  },
})
