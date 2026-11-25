import { Pressable, StyleSheet, Text, View } from 'react-native'

import { AndroidSafeAreaView } from './AndroidSafeAreaView'

type ErrorScreenProps = {
  testId?: string
  /** Heading shown above the error. Defaults to a connectivity message. */
  title?: string
  error: string
  /** Label for the single action button. Defaults to "Exit". */
  ctaLabel?: string
  cta: () => void
}

export const ErrorScreen = ({
  testId,
  title = 'Cannot connect to the internet.',
  error,
  ctaLabel = 'Exit',
  cta,
}: ErrorScreenProps) => (
  <AndroidSafeAreaView testId={testId}>
    <View style={[styles.container, styles.padding]}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginVertical: 10,
          }}
        >
          <Text style={[styles.title]}>{title}</Text>
        </View>
        <Text style={[styles.subtitle]}>{error}</Text>
      </View>
      <Pressable style={[styles.pressable]} onPress={cta}>
        <Text style={[styles.pressableText]}>{ctaLabel}</Text>
      </Pressable>
    </View>
  </AndroidSafeAreaView>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    backgroundColor: '#F3F4F6',
  },
  title: {
    color: '#1F2937',
    fontSize: 30,
    fontWeight: 'bold',
  },
  subtitle: {
    color: 'rgba(107, 114, 128, 1)',
  },
  padding: {
    paddingHorizontal: 16, // sm:px-4
    paddingVertical: 24, // sm:py-6
  },
  pressable: {
    marginTop: 20,
    backgroundColor: '#1F2937',
    padding: 10,
    paddingHorizontal: 25,
    borderRadius: 5,
  },
  pressableText: {
    color: '#fff',
    textAlign: 'center',
  },
})
