import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/ctx/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, isLoading, isWorkshop } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onHomeScreen = (segments.length as number) === 0 || 
                         (segments[0] === '(tabs)' && segments.length === 1) ||
                         (segments[0] === '(tabs)' && segments[1] === '' as any) ||
                         (segments[0] === '(tabs)' && segments[1] === 'index' as any);

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session) {
      if (inAuthGroup) {
        router.replace(isWorkshop ? '/(tabs)/agenda' : '/(tabs)');
      } else if (onHomeScreen && isWorkshop) {
        router.replace('/(tabs)/agenda');
      }
    }
  }, [session, segments, isLoading, isWorkshop]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="workshop-details"
          options={{
            title: 'Detalle del Taller',
            headerBackTitle: 'Inicio',
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

