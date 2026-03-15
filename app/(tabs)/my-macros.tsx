import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getWeeklyMacroSummaries } from '@/services/macro-aggregation';
import { useAppStore } from '@/store/app-store';

const CALORIE_GOAL = 2200;

export default function MyMacrosScreen() {
  const { meals } = useAppStore();
  const weekly = getWeeklyMacroSummaries(meals);
  const weeklyAverage = Math.round(
    weekly.reduce((sum, day) => sum + day.totals.calories, 0) / Math.max(1, weekly.length)
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.section}>
        <ThemedText type="title">My Macros</ThemedText>
        <ThemedText>Your week at a glance.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Weekly Calories</ThemedText>
        {weekly.map((day) => {
          const percent = Math.min(100, Math.round((day.totals.calories / CALORIE_GOAL) * 100));
          return (
            <View key={day.dateKey} style={styles.barRow}>
              <ThemedText style={styles.dayLabel}>{day.dateKey.slice(5)}</ThemedText>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${percent}%` }]} />
              </View>
              <ThemedText style={styles.valueLabel}>{day.totals.calories} kcal</ThemedText>
            </View>
          );
        })}
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Trend Snapshot</ThemedText>
        <ThemedText>Weekly average: {weeklyAverage} kcal/day</ThemedText>
        <ThemedText>
          Logged meals this week: {weekly.reduce((count, day) => count + day.mealCount, 0)}
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    width: 44,
  },
  track: {
    flex: 1,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#E3E3E3',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#0a7ea4',
  },
  valueLabel: {
    width: 72,
    textAlign: 'right',
  },
});
