import { useEffect, useRef } from 'react'
import { Linking, Platform, StyleSheet } from 'react-native'

import type { ConnectorSDKCallbackMetadata, QuilttConnectorHandle } from '@quiltt/react-native'
import { QuilttConnector } from '@quiltt/react-native'

import { ThemedView } from '@/components/ThemedView'

const CONNECTOR_ID = process.env.EXPO_PUBLIC_CONNECTOR_ID
const APP_LAUNCHER_URL = process.env.EXPO_PUBLIC_APP_LAUNCHER_URL
const INSTITUTION_SEARCH_TERM = process.env.EXPO_PUBLIC_INSTITUTION_SEARCH_TERM

export default function ConnectorScreen() {
  const connectorRef = useRef<QuilttConnectorHandle>(null)

  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      console.log('Received deep link:', url)

      if (url && connectorRef.current) {
        connectorRef.current.handleOAuthCallback(url)
      }
    }

    const subscription = Linking.addEventListener('url', handleUrl)

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
    <ThemedView
      accessibilityLabel="quiltt-connector-root"
      accessible
      testID={Platform.OS === 'ios' ? 'quiltt-connector' : undefined}
      style={styles.container}
    >
      <QuilttConnector
        ref={connectorRef}
        connectorId={CONNECTOR_ID!}
        appLauncherUrl={APP_LAUNCHER_URL ?? 'https://example.com/callback'}
        institution={INSTITUTION_SEARCH_TERM}
        testId="quiltt-connector"
        onExitSuccess={(metadata: ConnectorSDKCallbackMetadata) => {
          console.log(metadata.connectionId)
        }}
        onExitAbort={() => {}}
        onExitError={(metadata: ConnectorSDKCallbackMetadata) => {
          console.log(metadata.connectorId)
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
