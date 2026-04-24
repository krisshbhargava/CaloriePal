import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RaisedPressable } from '@/components/raised-pressable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.inner, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.appName}>CaloriePal</ThemedText>
          <ThemedText style={[styles.tagline, { color: theme.tabIconDefault }]}>
            Track smarter. Eat better.
          </ThemedText>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { borderColor: theme.cardBorder, color: theme.text, backgroundColor: theme.card }]}
            placeholder="Email"
            placeholderTextColor={theme.tabIconDefault}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={[styles.input, { borderColor: theme.cardBorder, color: theme.text, backgroundColor: theme.card }]}
            placeholder="Password"
            placeholderTextColor={theme.tabIconDefault}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
          />

          {error ? <ThemedText style={[styles.error, { color: theme.error }]}>{error}</ThemedText> : null}

          <RaisedPressable
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={handleLogin}
            disabled={loading}
            shadowColor={theme.accent}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Log in</ThemedText>
            )}
          </RaisedPressable>

          <Pressable onPress={() => router.replace('/auth/signup')}>
            <ThemedText style={[styles.switchText, { color: theme.tabIconDefault }]}>
              Don&apos;t have an account?{' '}
              <ThemedText style={[styles.switchLink, { color: theme.accent }]}>Sign up</ThemedText>
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function friendlyError(code: string): string {
  switch (code) {
    case 'auth/invalid-email': return 'Invalid email address.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Incorrect email or password.';
    case 'auth/too-many-requests': return 'Too many attempts. Try again later.';
    default: return 'Something went wrong. Please try again.';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  appName: {
    fontSize: 44,
  },
  tagline: {
    fontSize: 16,
    fontFamily: Fonts.regular,
  },
  form: {
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: Fonts.regular,
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: Fonts.regular,
  },
  button: {
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontFamily: Fonts.bold,
    fontSize: 17,
  },
  switchText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  switchLink: {
    fontFamily: Fonts.semiBold,
  },
});
