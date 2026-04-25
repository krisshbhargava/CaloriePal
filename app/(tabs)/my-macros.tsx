import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RaisedPressable } from '@/components/raised-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getWeeklyMacroSummaries } from '@/services/macro-aggregation';
import { useAppStore } from '@/store/app-store';
import type { MacroGoals } from '@/store/app-store';

const TOP_INSET_EXTRA = 12;

function parsePositiveInt(s: string): number | null {
  if (s === '') return null;
  const n = parseInt(s, 10);
  return !isNaN(n) && n >= 0 ? n : null;
}

export default function MyMacrosScreen() {
  const { meals, macroGoals, reminderPreferences, setMacroGoals, saveSmsReminderPreferences } = useAppStore();
  const { signOut, user } = useAuth();
  const email = user?.email ?? '';
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [isUpdatingReminders, setIsUpdatingReminders] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(reminderPreferences.phoneNumber);
  const [smsEnabled, setSmsEnabled] = useState(reminderPreferences.enabled);
  const weekly = getWeeklyMacroSummaries(meals);
  const weeklyAverage = Math.round(
    weekly.reduce((sum, day) => sum + day.totals.calories, 0) / Math.max(1, weekly.length)
  );

  useEffect(() => {
    setPhoneNumber(reminderPreferences.phoneNumber);
    setSmsEnabled(reminderPreferences.enabled);
  }, [reminderPreferences.enabled, reminderPreferences.phoneNumber]);

  const updateGoal = (key: keyof MacroGoals, text: string) => {
    const value = parsePositiveInt(text);
    if (value !== null) setMacroGoals({ [key]: value });
  };

  const handleSaveReminders = async () => {
    if (isUpdatingReminders) return;

    setIsUpdatingReminders(true);
    try {
      const result = await saveSmsReminderPreferences({
        enabled: smsEnabled,
        phoneNumber,
      });
      if (!result.ok) {
        Alert.alert('SMS reminder settings', result.error ?? 'We could not save those settings.');
        return;
      }

      Alert.alert(
        'SMS reminder settings saved',
        smsEnabled
          ? 'CaloriePal will text gentle meal-time reminders when your server-side schedule runs.'
          : 'SMS reminders are off.'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not save those settings.';
      Alert.alert('SMS reminder settings', message);
    } finally {
      setIsUpdatingReminders(false);
    }
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + TOP_INSET_EXTRA }]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.centered}>
        <ThemedView style={[styles.headerCard, { backgroundColor: theme.accent }]}>
          <ThemedText type="title" lightColor={theme.background} darkColor={theme.background}>
            My Macros
          </ThemedText>
          <ThemedText lightColor="rgba(255,255,255,0.9)" darkColor="rgba(255,255,255,0.9)">
            Your week at a glance.
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.section, styles.card, { backgroundColor: theme.card }]}>
          <ThemedText type="subtitle">Daily goals</ThemedText>
          <ThemedText style={styles.goalsHint}>Set your daily targets (used for progress on the home screen).</ThemedText>
          <View style={styles.goalRow}>
            <ThemedText style={styles.goalLabel}>Calories (kcal)</ThemedText>
            <TextInput
              value={String(macroGoals.calories)}
              onChangeText={(text) => updateGoal('calories', text)}
              keyboardType="number-pad"
              placeholder="2000"
              placeholderTextColor={theme.tabIconDefault}
              style={[styles.goalInput, { borderColor: theme.cardBorder, color: theme.text }]}
            />
          </View>
          <View style={styles.goalRow}>
            <ThemedText style={styles.goalLabel}>Protein (g)</ThemedText>
            <TextInput
              value={String(macroGoals.protein)}
              onChangeText={(text) => updateGoal('protein', text)}
              keyboardType="number-pad"
              placeholder="150"
              placeholderTextColor={theme.tabIconDefault}
              style={[styles.goalInput, { borderColor: theme.cardBorder, color: theme.text }]}
            />
          </View>
          <View style={styles.goalRow}>
            <ThemedText style={styles.goalLabel}>Carbs (g)</ThemedText>
            <TextInput
              value={String(macroGoals.carbs)}
              onChangeText={(text) => updateGoal('carbs', text)}
              keyboardType="number-pad"
              placeholder="200"
              placeholderTextColor={theme.tabIconDefault}
              style={[styles.goalInput, { borderColor: theme.cardBorder, color: theme.text }]}
            />
          </View>
          <View style={styles.goalRow}>
            <ThemedText style={styles.goalLabel}>Fat (g)</ThemedText>
            <TextInput
              value={String(macroGoals.fat)}
              onChangeText={(text) => updateGoal('fat', text)}
              keyboardType="number-pad"
              placeholder="65"
              placeholderTextColor={theme.tabIconDefault}
              style={[styles.goalInput, { borderColor: theme.cardBorder, color: theme.text }]}
            />
          </View>
        </ThemedView>

        <ThemedView style={[styles.section, styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderCopy}>
              <ThemedText type="subtitle">SMS meal reminders</ThemedText>
              <ThemedText style={styles.goalsHint}>
                Text gentle nudges before common meal times if you still have calories or protein left and have
                not been active in a while.
              </ThemedText>
            </View>
            <Switch
              value={smsEnabled}
              onValueChange={setSmsEnabled}
              disabled={isUpdatingReminders}
              trackColor={{ false: theme.surface, true: theme.primaryMuted }}
              thumbColor={smsEnabled ? theme.primary : '#f4f3f4'}
            />
          </View>

          <View style={styles.smsField}>
            <ThemedText style={styles.smsLabel}>Mobile number</ThemedText>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="phone-pad"
              placeholder="+15551234567"
              placeholderTextColor={theme.tabIconDefault}
              style={[styles.smsInput, { borderColor: theme.cardBorder, color: theme.text }]}
            />
          </View>

          <ThemedView style={[styles.reminderNote, { backgroundColor: theme.surface }]}>
            <ThemedText style={styles.reminderNoteText}>
              Time zone: {reminderPreferences.timezone}. Use E.164 format for best results, like +15551234567.
            </ThemedText>
          </ThemedView>

          <RaisedPressable
            onPress={() => void handleSaveReminders()}
            style={[styles.saveReminderButton, { backgroundColor: theme.primary }]}
            shadowColor={theme.primary}>
            <ThemedText style={styles.saveReminderText}>
              {isUpdatingReminders ? 'Saving...' : 'Save SMS reminders'}
            </ThemedText>
          </RaisedPressable>
        </ThemedView>

        <ThemedView style={[styles.section, styles.card, { backgroundColor: theme.card }]}>
          <ThemedText type="subtitle">Weekly calories</ThemedText>
          {weekly.map((day) => {
            const goal = macroGoals.calories || 2000;
            const percent = Math.min(100, Math.round((day.totals.calories / goal) * 100));
            return (
              <View key={day.dateKey} style={styles.barRow}>
                <ThemedText style={styles.dayLabel}>{day.dateKey.slice(5)}</ThemedText>
                <View style={[styles.track, { backgroundColor: theme.surface }]}>
                  <View style={[styles.fill, { width: `${percent}%`, backgroundColor: theme.primary }]} />
                </View>
                <ThemedText style={styles.valueLabel}>{day.totals.calories} kcal</ThemedText>
              </View>
            );
          })}
        </ThemedView>

        <ThemedView style={[styles.section, styles.card, { backgroundColor: theme.card }]}>
          <ThemedText type="subtitle">Trend snapshot</ThemedText>
          <ThemedView style={[styles.statRow, { backgroundColor: theme.surface }]}>
            <ThemedText>Weekly average</ThemedText>
            <ThemedText type="defaultSemiBold">{weeklyAverage} kcal/day</ThemedText>
          </ThemedView>
          <ThemedView style={[styles.statRow, { backgroundColor: theme.surface }]}>
            <ThemedText>Logged meals this week</ThemedText>
            <ThemedText type="defaultSemiBold">
              {weekly.reduce((count, day) => count + day.mealCount, 0)}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={[styles.section, styles.card, { backgroundColor: theme.card }]}>
          <ThemedText style={[styles.accountEmail, { color: theme.tabIconDefault }]}>{email}</ThemedText>
          <RaisedPressable style={[styles.signOutButton, { borderColor: theme.error }]} onPress={signOut} shadowColor={theme.error}>
            <ThemedText style={[styles.signOutText, { color: theme.error }]}>Sign out</ThemedText>
          </RaisedPressable>
        </ThemedView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: Layout.screenPadding,
    paddingBottom: 40,
    flexGrow: 1,
  },
  centered: {
    maxWidth: Layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Layout.sectionGap,
  },
  headerCard: {
    padding: 24,
    borderRadius: 28,
    gap: 8,
  },
  section: {
    padding: Layout.cardPadding,
    borderRadius: 20,
    gap: 12,
  },
  card: { ...Shadows.card },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  reminderCopy: {
    flex: 1,
    gap: 4,
  },
  smsField: {
    gap: 8,
  },
  smsLabel: {
    fontSize: 14,
    opacity: 0.8,
  },
  smsInput: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  saveReminderButton: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveReminderText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  reminderNote: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reminderNoteText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.85,
  },
  goalsHint: {
    fontSize: 14,
    opacity: 0.85,
    marginBottom: 4,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  goalLabel: {
    fontSize: 15,
    minWidth: 120,
  },
  goalInput: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600' as const,
    minWidth: 88,
    textAlign: 'right',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayLabel: {
    width: 48,
    fontSize: 14,
  },
  track: {
    flex: 1,
    height: 14,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  valueLabel: {
    width: 76,
    textAlign: 'right',
    fontSize: 14,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
  },
  accountEmail: {
    fontSize: 13,
    textAlign: 'center',
  },
  signOutButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
});
