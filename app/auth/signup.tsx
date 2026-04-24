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
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signUp(email.trim(), password);
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
            Create your account
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
          />
          <TextInput
            style={[styles.input, { borderColor: theme.cardBorder, color: theme.text, backgroundColor: theme.card }]}
            placeholder="Confirm password"
            placeholderTextColor={theme.tabIconDefault}
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
            onSubmitEditing={handleSignUp}
          />

          {error ? <ThemedText style={[styles.error, { color: theme.error }]}>{error}</ThemedText> : null}

          <RaisedPressable
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={handleSignUp}
            disabled={loading}
            shadowColor={theme.accent}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Create account</ThemedText>
            )}
          </RaisedPressable>

          <Pressable onPress={() => router.replace('/auth/login')}>
            <ThemedText style={[styles.switchText, { color: theme.tabIconDefault }]}>
              Already have an account?{' '}
              <ThemedText style={[styles.switchLink, { color: theme.accent }]}>Log in</ThemedText>
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
    case 'auth/email-already-in-use': return 'An account with this email already exists.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
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
    fontWeight: '400' as const,
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
    fontWeight: '400' as const,
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '400' as const,
  },
  button: {
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700' as const,
    fontSize: 17,
  },
  switchText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '400' as const,
  },
  switchLink: {
    fontWeight: '600' as const,
  },
});
