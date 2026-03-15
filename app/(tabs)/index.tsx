import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Layout } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getDailyMacroSummary } from '@/services/macro-aggregation';
import { useAppStore } from '@/store/app-store';

export default function DashboardScreen() {
  const { meals } = useAppStore();
  const colorScheme = useColorScheme() ?? 'light';
  const summary = getDailyMacroSummary(meals, new Date());
  const todaysMeals = meals.filter((meal) => meal.timestamp.slice(0, 10) === summary.dateKey);
  const theme = Colors[colorScheme];

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.centered}>
        <ThemedView style={[styles.headerCard, { backgroundColor: theme.accent }]}>
          <ThemedText type="title" lightColor={theme.background} darkColor={theme.background}>
            Today&apos;s Progress
          </ThemedText>
          <ThemedText lightColor="rgba(255,255,255,0.9)" darkColor="rgba(255,255,255,0.9)">
            Low-pressure progress. Log what you can.
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.section, styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <ThemedText type="subtitle">Macro Totals</ThemedText>
          <View style={styles.metricRow}>
            <Metric label="Calories" value={`${summary.totals.calories} kcal`} theme={theme} />
            <Metric label="Protein" value={`${summary.totals.protein} g`} theme={theme} />
          </View>
          <View style={styles.metricRow}>
            <Metric label="Carbs" value={`${summary.totals.carbs} g`} theme={theme} />
            <Metric label="Fat" value={`${summary.totals.fat} g`} theme={theme} />
          </View>
        </ThemedView>

        <ThemedView style={[styles.section, styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <ThemedText type="subtitle">Today&apos;s Meals</ThemedText>
          {todaysMeals.length === 0 ? (
            <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
              <ThemedText>No meals logged yet today.</ThemedText>
              <Link href="/(tabs)/log-meal">
                <ThemedText type="link">Log your first meal</ThemedText>
              </Link>
            </ThemedView>
          ) : (
            todaysMeals.map((meal) => (
              <ThemedView
                key={meal.id}
                style={[styles.mealCard, { backgroundColor: theme.surface, borderLeftColor: theme.primary }]}>
                <ThemedText type="defaultSemiBold">{meal.title}</ThemedText>
                <ThemedText>{meal.description}</ThemedText>
                <ThemedText>
                  {meal.calories} kcal • P {meal.protein} • C {meal.carbs} • F {meal.fat}
                </ThemedText>
              </ThemedView>
            ))
          )}
        </ThemedView>
      </View>
    </ScrollView>
  );
}

function Metric({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: (typeof Colors)['light'];
}) {
  return (
    <ThemedView style={[styles.metricCard, { backgroundColor: theme.surface }]}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <ThemedText>{value}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
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
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  mealCard: {
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderLeftWidth: 4,
  },
  emptyState: {
    gap: 8,
    borderRadius: 12,
    padding: 14,
  },
});
