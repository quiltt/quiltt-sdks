import { useEffect } from 'react'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import 'react-native-reanimated'

import * as Linking from 'expo-linking'

import { QuilttProvider } from '@quiltt/react-native'

import { useColorScheme } from '@/hooks/useColorScheme'

const QUILTT_CLIENT_ID = process.env.EXPO_PUBLIC_QUILTT_CLIENT_ID
const QUILTT_AUTH_TOKEN = process.env.EXPO_PUBLIC_QUILTT_AUTH_TOKEN

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  /**
   * This is the most recent callback URL the app received.
   *
   * @example
   * <QuilttConnector appLauncherUrl="https://example.com/callback" />
   */
  const url = Linking.useURL()

  useEffect(() => {
    // Inspect callback URLs received by the app while debugging OAuth redirects.
    console.log({ url })
  }, [url])

  const colorScheme = useColorScheme()
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync()
    }
  }, [loaded])

  if (!loaded) {
    return null
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <QuilttProvider clientId={QUILTT_CLIENT_ID!} token={QUILTT_AUTH_TOKEN!}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </QuilttProvider>
    </ThemeProvider>
  )
}
