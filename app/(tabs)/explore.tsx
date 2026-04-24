import { useMemo, useState } from 'react';

import { ScrollView, StyleSheet, TextInput, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EditMealModal } from '@/components/edit-meal-modal';
import { RaisedPressable } from '@/components/raised-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MealBreakdownList } from '@/components/meal-breakdown-list';
import { Colors, Fonts, Layout, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MealEntry } from '@/models/domain';
import { getDateKey } from '@/services/macro-aggregation';
import { useAppStore } from '@/store/app-store';

const TOP_INSET_EXTRA = 12;

type CalendarDay = {
  date: Date;
  dateKey: string;
  calories: number;
  hasMeals: boolean;
};

function buildMonthDays(mealsByDate: Record<string, { calories: number }>, monthDate: Date): {
  label: string;
  weeks: (CalendarDay | null)[][];
} {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks: (CalendarDay | null)[][] = [];
  let dayCounter = 1 - firstWeekday;

  while (dayCounter <= daysInMonth) {
    const week: (CalendarDay | null)[] = [];
    for (let w = 0; w < 7; w += 1) {
      if (dayCounter < 1 || dayCounter > daysInMonth) {
        week.push(null);
      } else {
        const date = new Date(year, month, dayCounter);
        const dateKey = getDateKey(date);
        const meta = mealsByDate[dateKey];
        week.push({
          date,
          dateKey,
          calories: meta?.calories ?? 0,
          hasMeals: !!meta,
        });
      }
      dayCounter += 1;
    }
    weeks.push(week);
  }

  const label = monthDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return { label, weeks };
}

export default function ExploreCalendarScreen() {
  const { meals, dateNotes, setDateNote, editMeal, startEditSession } = useAppStore();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => getDateKey(new Date()));
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);
  const [expandedMealIds, setExpandedMealIds] = useState<Record<string, boolean>>({});

  const selectedNote = dateNotes[selectedDateKey] ?? '';
  const selectedDateLabel = useMemo(() => {
    const d = new Date(selectedDateKey);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }, [selectedDateKey]);

  const mealsByDate = useMemo(() => {
    const grouped: Record<string, { calories: number; ids: string[] }> = {};

    meals.forEach((meal) => {
      const key = meal.timestamp.slice(0, 10);
      if (!grouped[key]) {
        grouped[key] = { calories: 0, ids: [] };
      }
      grouped[key].calories += meal.calories;
      grouped[key].ids.push(meal.id);
    });

    return grouped;
  }, [meals]);

  const calendar = useMemo(
    () => buildMonthDays(mealsByDate, currentMonth),
    [mealsByDate, currentMonth]
  );

  const selectedMeals = useMemo(
    () => meals.filter((meal) => meal.timestamp.slice(0, 10) === selectedDateKey),
    [meals, selectedDateKey]
  );

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() - 1);
      return next;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + 1);
      return next;
    });
  };

  const toggleMealExpanded = (mealId: string) => {
    setExpandedMealIds((prev) => ({ ...prev, [mealId]: !prev[mealId] }));
  };

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
      showsVerticalScrollIndicator={false}>
      <View style={styles.centered}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={{ fontFamily: Fonts.extraBold }}>
            Calendar
          </ThemedText>
          <ThemedText>Tap a day to see logged meals.</ThemedText>
        </ThemedView>

        <ThemedView style={[styles.calendarCard, { backgroundColor: theme.card }]}>
          <View style={styles.monthHeader}>
            <RaisedPressable onPress={handlePrevMonth} hitSlop={12} style={styles.monthNav} shadowColor={theme.primary}>
              <ThemedText type="defaultSemiBold" style={{ color: theme.accent }}>{'‹'}</ThemedText>
            </RaisedPressable>
            <ThemedText type="defaultSemiBold" style={[styles.monthLabel, { fontFamily: Fonts.extraBold }]}>
              {calendar.label}
            </ThemedText>
            <RaisedPressable onPress={handleNextMonth} hitSlop={12} style={styles.monthNav} shadowColor={theme.primary}>
              <ThemedText type="defaultSemiBold" style={{ color: theme.accent }}>{'›'}</ThemedText>
            </RaisedPressable>
          </View>

          <View style={styles.weekdayRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, index) => (
              <ThemedText key={`${d}-${index}`} style={styles.weekdayLabel}>
                {d}
              </ThemedText>
            ))}
          </View>

          {calendar.weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.map((day, dayIndex) => {
                if (!day) {
                  return <View key={dayIndex} style={styles.dayCell} />;
                }

                const isSelected = day.dateKey === selectedDateKey;
                const hasCalories = day.calories > 0;
                const hasNote = !!(dateNotes[day.dateKey]?.trim());

                return (
                  <RaisedPressable
                    key={dayIndex}
                    style={[
                      styles.dayCell,
                      { backgroundColor: theme.surface },
                      isSelected && { backgroundColor: theme.primary, borderWidth: 2, borderColor: theme.accent },
                      hasCalories && !isSelected && { backgroundColor: theme.primaryMuted },
                    ]}
                    shadowColor={isSelected ? theme.accent : theme.primary}
                    onPress={() => setSelectedDateKey(day.dateKey)}>
                    {hasNote && (
                      <View style={[styles.noteDot, { backgroundColor: theme.accent }]} />
                    )}
                    <ThemedText
                      type="defaultSemiBold"
                      style={[
                        styles.dayNumber,
                        isSelected && { color: theme.accent },
                        isSelected && { fontFamily: Fonts.extraBold },
                      ]}>
                      {day.date.getDate()}
                    </ThemedText>
                    {hasCalories && (
                      <ThemedText
                        style={[styles.dayCalories, isSelected && { color: theme.accent }]}
                        numberOfLines={1}>
                        {day.calories} kcal
                      </ThemedText>
                    )}
                  </RaisedPressable>
                );
              })}
            </View>
          ))}
        </ThemedView>

        <ThemedView style={[styles.mealsCard, { backgroundColor: theme.card }]}>
          <ThemedText type="subtitle">Meals on selected day</ThemedText>
          {selectedMeals.length === 0 ? (
            <ThemedText>No meals logged on this day.</ThemedText>
          ) : (
            selectedMeals.map((meal) => (
              <ThemedView
                key={meal.id}
                style={[styles.mealItem, { backgroundColor: theme.surface, borderLeftColor: theme.primary }]}
                >
                <Pressable onPress={() => toggleMealExpanded(meal.id)} style={styles.mealSummaryRow}>
                  <View style={styles.mealSummaryLeft}>
                    {!!meal.photoUri && (
                      <Image source={{ uri: meal.photoUri }} style={styles.mealThumb} contentFit="cover" />
                    )}
                    <View style={styles.mealSummaryTextWrap}>
                      <ThemedText type="defaultSemiBold" numberOfLines={1}>
                        {meal.title}
                      </ThemedText>
                      <ThemedText style={styles.mealCaloriesBubble}>{meal.calories} kcal</ThemedText>
                    </View>
                  </View>
                  <ThemedText style={{ color: theme.accent }}>
                    {expandedMealIds[meal.id] ? 'Hide' : 'Details'}
                  </ThemedText>
                </Pressable>
                {expandedMealIds[meal.id] && (
                  <View style={styles.mealDetails}>
                    <ThemedText>{meal.description}</ThemedText>
                    <ThemedText>
                      P {meal.protein} • C {meal.carbs} • F {meal.fat}
                    </ThemedText>
                    <MealBreakdownList components={meal.components} compact />
                    <Pressable onPress={() => setEditingMeal(meal)} style={styles.editMealRow}>
                      <ThemedText style={{ color: theme.accent }}>Edit meal</ThemedText>
                    </Pressable>
                  </View>
                )}
              </ThemedView>
            ))
          )}
        </ThemedView>

        <ThemedView style={[styles.notesCard, { backgroundColor: theme.card }]}>
          <ThemedText type="subtitle">Notes for {selectedDateLabel}</ThemedText>
          <ThemedText style={styles.notesHint}>
            e.g. meal didn&apos;t sit well, had a headache, felt great
          </ThemedText>
          <TextInput
            value={selectedNote}
            onChangeText={(text) => setDateNote(selectedDateKey, text)}
            placeholder="Add a note for this day..."
            placeholderTextColor={theme.tabIconDefault}
            style={[styles.notesInput, { borderColor: theme.cardBorder, color: theme.text }]}
            multiline
            numberOfLines={3}
          />
        </ThemedView>
      </View>
    </ScrollView>
    </>
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
  header: {
    gap: 6,
  },
  calendarCard: {
    borderRadius: 20,
    padding: 14,
    gap: 8,
    ...Shadows.card,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthNav: {
    padding: 4,
  },
  monthLabel: {
    fontSize: 18,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dayCell: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  dayNumber: {
    fontSize: 14,
    marginBottom: 2,
  },
  dayCalories: {
    fontSize: 10,
  },
  mealsCard: {
    borderRadius: 20,
    padding: 14,
    gap: 10,
    ...Shadows.card,
  },
  mealItem: {
    borderRadius: 16,
    padding: 12,
    gap: 4,
    borderLeftWidth: 4,
  },
  mealSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mealSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  mealThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  mealSummaryTextWrap: {
    flex: 1,
    gap: 4,
  },
  mealCaloriesBubble: {
    alignSelf: 'flex-start',
    fontSize: 12,
    opacity: 0.8,
  },
  mealDetails: {
    marginTop: 10,
    gap: 6,
  },
  editMealRow: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  noteDot: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  notesCard: {
    borderRadius: 20,
    padding: 14,
    gap: 10,
    ...Shadows.card,
  },
  notesHint: {
    fontSize: 14,
    opacity: 0.8,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    fontSize: 16,
    fontFamily: Fonts.regular,
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
