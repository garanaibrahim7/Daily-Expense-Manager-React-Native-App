// template
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { TransactionProvider } from "@/providers/TransactionProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

import { LogBox } from 'react-native';
const ignoreWarnings = [
  'ProgressBarAndroid has been extracted',
  'SafeAreaView has been deprecated',
  'Clipboard has been extracted',
  'PushNotificationIOS has been extracted',
];

LogBox.ignoreLogs(ignoreWarnings);

// Suppress console warnings in terminal
const originalWarn = console.warn;
console.warn = (...args) => {
  const msg = args.join(' ');
  if (ignoreWarnings.some(w => msg.includes(w))) {
    return;
  }
  originalWarn(...args);
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)';

    if (!user && inAuthGroup) {
      router.replace('/login');
    } else if (user && !inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return null;
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <ProtectedRoute>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ProtectedRoute>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TransactionProvider>
          <GestureHandlerRootView>
            <RootLayoutNav />
          </GestureHandlerRootView>
        </TransactionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
