import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getDailyMacroSummary } from '@/services/macro-aggregation';
import { useAppStore } from '@/store/app-store';

export default function DashboardScreen() {
  const { meals } = useAppStore();
  const summary = getDailyMacroSummary(meals, new Date());
  const todaysMeals = meals.filter((meal) => meal.timestamp.slice(0, 10) === summary.dateKey);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.headerCard}>
        <ThemedText type="title">Today&apos;s Progress</ThemedText>
        <ThemedText>Low-pressure progress. Log what you can.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Macro Totals</ThemedText>
        <View style={styles.metricRow}>
          <Metric label="Calories" value={`${summary.totals.calories} kcal`} />
          <Metric label="Protein" value={`${summary.totals.protein} g`} />
        </View>
        <View style={styles.metricRow}>
          <Metric label="Carbs" value={`${summary.totals.carbs} g`} />
          <Metric label="Fat" value={`${summary.totals.fat} g`} />
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Today&apos;s Meals</ThemedText>
        {todaysMeals.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <ThemedText>No meals logged yet today.</ThemedText>
            <Link href="/(tabs)/log-meal">
              <ThemedText type="link">Log your first meal</ThemedText>
            </Link>
          </ThemedView>
        ) : (
          todaysMeals.map((meal) => (
            <ThemedView key={meal.id} style={styles.mealCard}>
              <ThemedText type="defaultSemiBold">{meal.title}</ThemedText>
              <ThemedText>{meal.description}</ThemedText>
              <ThemedText>
                {meal.calories} kcal • P {meal.protein} • C {meal.carbs} • F {meal.fat}
              </ThemedText>
            </ThemedView>
          ))
        )}
      </ThemedView>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView style={styles.metricCard}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <ThemedText>{value}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  headerCard: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  mealCard: {
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  emptyState: {
    gap: 6,
    borderRadius: 10,
    padding: 10,
  },
});
