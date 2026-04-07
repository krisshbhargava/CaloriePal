import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EditMealModal } from '@/components/edit-meal-modal';
import { MealBreakdownList } from '@/components/meal-breakdown-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Layout } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MealEntry } from '@/models/domain';
import { getDailyMacroSummary } from '@/services/macro-aggregation';
import { useAppStore } from '@/store/app-store';

const TOP_INSET_EXTRA = 12;

export default function DashboardScreen() {
  const { meals, editMeal, startEditSession, macroGoals } = useAppStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const summary = getDailyMacroSummary(meals, new Date());
  const todaysMeals = meals.filter((meal) => meal.timestamp.slice(0, 10) === summary.dateKey);
  const theme = Colors[colorScheme];
  const hasNoMeals = meals.length === 0;

  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);

  const goToLogMeal = () => router.push('/(tabs)/log-meal');

  return (
    <>
      <EditMealModal
        meal={editingMeal}
        onClose={() => setEditingMeal(null)}
        onSaveManual={(id, updates) => editMeal(id, updates)}
        onEditWithAI={(meal) => startEditSession(meal)}
      />

      <ScrollView
        style={[styles.scroll, { backgroundColor: theme.background }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + TOP_INSET_EXTRA }]}
        showsVerticalScrollIndicator={false}
      >
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
            <ThemedText type="subtitle">Daily progress</ThemedText>
            <ThemedText style={styles.progressHint}>Progress toward your daily goals (set in My Macros).</ThemedText>
            <ProgressBar
              label="Calories"
              current={summary.totals.calories}
              goal={macroGoals.calories}
              unit="kcal"
              theme={theme}
            />
            <ProgressBar
              label="Protein"
              current={summary.totals.protein}
              goal={macroGoals.protein}
              unit="g"
              theme={theme}
            />
            <ProgressBar
              label="Carbs"
              current={summary.totals.carbs}
              goal={macroGoals.carbs}
              unit="g"
              theme={theme}
            />
            <ProgressBar
              label="Fat"
              current={summary.totals.fat}
              goal={macroGoals.fat}
              unit="g"
              theme={theme}
            />
          </ThemedView>

          <ThemedView style={[styles.section, styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <ThemedText type="subtitle">Today&apos;s Meals</ThemedText>
            {todaysMeals.length === 0 ? (
              <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
                <ThemedText>
                  {hasNoMeals
                    ? "You haven't logged any meals yet."
                    : "No meals logged yet today."}
                </ThemedText>
                <Pressable
                  style={[styles.addMealButton, { backgroundColor: theme.primary }]}
                  onPress={goToLogMeal}
                >
                  <ThemedText style={[styles.addMealButtonText, { color: theme.accent }]}>
                    {hasNoMeals ? 'Add your first meal' : 'Log a meal'}
                  </ThemedText>
                </Pressable>
              </ThemedView>
            ) : (
              todaysMeals.map((meal) => (
                <Pressable
                  key={meal.id}
                  onPress={() => setEditingMeal(meal)}
                  style={({ pressed }) => [
                    styles.mealCard,
                    { backgroundColor: theme.surface, borderLeftColor: theme.primary },
                    pressed && styles.mealCardPressed,
                  ]}
                >
                  <View style={styles.mealCardHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.mealTitle} numberOfLines={1}>
                      {meal.title}
                    </ThemedText>
                    <View style={[styles.editPill, { borderColor: theme.accent }]}>
                      <ThemedText style={[styles.editPillText, { color: theme.accent }]}>
                        Edit
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.mealDescription} numberOfLines={2}>
                    {meal.description}
                  </ThemedText>
                  <ThemedText style={styles.mealMacros}>
                    {meal.calories} kcal · P {meal.protein}g · C {meal.carbs}g · F {meal.fat}g
                  </ThemedText>
                  <MealBreakdownList components={meal.components} compact />
                </Pressable>
              ))
            )}
          </ThemedView>
        </View>
      </ScrollView>
    </>
  );
}

function ProgressBar({
  label,
  current,
  goal,
  unit,
  theme,
}: {
  label: string;
  current: number;
  goal: number;
  unit: string;
  theme: (typeof Colors)['light'];
}) {
  const safeGoal = goal > 0 ? goal : 1;
  const percent = Math.min(100, Math.round((current / safeGoal) * 100));
  const isOver = current > safeGoal;

  return (
    <View style={styles.progressBarRow}>
      <View style={styles.progressBarHeader}>
        <ThemedText type="defaultSemiBold">{label}</ThemedText>
        <ThemedText style={styles.progressBarValues}>
          {current} / {goal} {unit}
        </ThemedText>
      </View>
      <View style={[styles.progressBarTrack, { backgroundColor: theme.surface }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${percent}%`,
              backgroundColor: isOver ? theme.accent : theme.primary,
            },
          ]}
        />
      </View>
    </View>
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
  card: { borderWidth: 1 },
  progressHint: {
    fontSize: 14,
    opacity: 0.85,
    marginBottom: 4,
  },
  progressBarRow: {
    gap: 6,
  },
  progressBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarValues: {
    fontSize: 14,
    opacity: 0.9,
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  mealCard: {
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderLeftWidth: 4,
  },
  mealCardPressed: { opacity: 0.7 },
  mealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  mealTitle: {
    flex: 1,
  },
  editPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  editPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  mealDescription: { opacity: 0.7, fontSize: 13, lineHeight: 18 },
  mealMacros: { fontSize: 13, opacity: 0.85, marginTop: 4 },
  emptyState: {
    gap: 12,
    borderRadius: 12,
    padding: 14,
  },
  addMealButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  addMealButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
