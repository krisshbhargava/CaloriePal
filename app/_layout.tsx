import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { RemoteConfigProvider } from '@/context/remote-config-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppStoreProvider } from '@/store/app-store';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/auth/login' as any);
    } else {
      router.replace('/(tabs)');
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RemoteConfigProvider>
          <AppStoreProvider>
            <RootNavigator />
          </AppStoreProvider>
        </RemoteConfigProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
