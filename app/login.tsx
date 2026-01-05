import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/providers/AuthProvider';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  console.log('[LoginScreen] calling useAuth...');
  const { signIn, signUp } = useAuth();
  console.log('[LoginScreen] useAuth success');

  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (isSignUp && password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setAuthError('');
    try {
      if (isSignUp) {
        await signUp(email, password, displayName || undefined);
        Alert.alert('Success', 'Account created successfully!');
      } else {
        await signIn(email, password);
      }
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Auth error:', error);

      let message = error.message;
      if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already registered';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = 'Invalid email or password';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password is too weak';
      } else if (error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password';
      } else if (error.code === 'auth/configuration-not-found') {
        message = 'Firebase Authentication not enabled.\n\nPlease enable Email/Password authentication in Firebase Console:\n\n1. Go to Firebase Console\n2. Click Authentication → Sign-in method\n3. Enable Email/Password\n4. Save and try again';
        Alert.alert('Error', message);
        return;
      }

      setAuthError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: tintColor + '15' }]}>
              <Image
                source={require('../assets/images/icon.png')}
                style={styles.icon}
                resizeMode="contain"
              />
            </View>
            <ThemedText type="title" style={styles.title}>Daily Expense Manager</ThemedText>
            <ThemedText style={styles.subtitle}>
              {isSignUp ? 'Create your account' : 'Sign in to your account'}
            </ThemedText>
          </View>

          <Card variant="elevated" style={styles.formCard}>
            {authError ? (
              <View style={[styles.errorContainer, { backgroundColor: Colors.light.error + '15' }]}>
                <ThemedText style={{ color: Colors.light.error, textAlign: 'center' }}>{authError}</ThemedText>
              </View>
            ) : null}

            <View style={styles.form}>
              {isSignUp && (
                <Input
                  label="Display Name"
                  placeholder="Enter your name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              )}

              <Input
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={isSignUp ? 'password-new' : 'password'}
                editable={!loading}
              />

              <Button
                variant="primary"
                onPress={handleSubmit}
                loading={loading}
                style={{ marginTop: 8 }}
              >
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Button>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <ThemedText style={styles.dividerText}>OR</ThemedText>
                <View style={styles.dividerLine} />
              </View>

              <Button
                variant="ghost"
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError('');
                }}
                disabled={loading}
              >
                {isSignUp ? 'Already have an account? Sign In' : 'Don\'t have an account? Sign Up'}
              </Button>
            </View>
          </Card>

          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 12, opacity: 0.5 }}>Powered by Firebase</ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView >
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    width: 120,
    height: 120, // Icon might be larger than container but contained
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  formCard: {
    padding: 24,
    borderRadius: 24,
  },
  form: {
    gap: 16,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e5e5', // Theme adaptation handling?
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    opacity: 0.5,
  },
});
