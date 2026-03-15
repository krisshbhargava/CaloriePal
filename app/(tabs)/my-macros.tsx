import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Layout } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getWeeklyMacroSummaries } from '@/services/macro-aggregation';
import { useAppStore } from '@/store/app-store';

const CALORIE_GOAL = 2200;

export default function MyMacrosScreen() {
  const { meals } = useAppStore();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const weekly = getWeeklyMacroSummaries(meals);
  const weeklyAverage = Math.round(
    weekly.reduce((sum, day) => sum + day.totals.calories, 0) / Math.max(1, weekly.length)
  );

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
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

        <ThemedView style={[styles.section, styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <ThemedText type="subtitle">Weekly calories</ThemedText>
          {weekly.map((day) => {
            const percent = Math.min(100, Math.round((day.totals.calories / CALORIE_GOAL) * 100));
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

        <ThemedView style={[styles.section, styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
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
    padding: Layout.cardPadding,
    borderRadius: 16,
    gap: 8,
  },
  section: {
    padding: Layout.cardPadding,
    borderRadius: 16,
    gap: 12,
  },
  card: {
    borderWidth: 1,
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
    padding: 14,
    borderRadius: 12,
  },
});
