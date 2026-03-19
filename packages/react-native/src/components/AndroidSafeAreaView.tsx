import type { PropsWithChildren } from 'react'
import { Platform, StatusBar, StyleSheet } from 'react-native'

import { SafeAreaView } from 'react-native-safe-area-context'

type AndroidSafeAreaViewProps = PropsWithChildren & {
  testId?: string
}

export const AndroidSafeAreaView = ({ testId, children }: AndroidSafeAreaViewProps) => (
  <SafeAreaView testID={testId} style={styles.AndroidSafeArea}>
    {children}
  </SafeAreaView>
)

const styles = StyleSheet.create({
  AndroidSafeArea: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
})
