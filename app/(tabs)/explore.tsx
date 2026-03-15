import { useMemo, useState } from 'react';

import { ScrollView, StyleSheet, View, Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts, Layout } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getDateKey } from '@/services/macro-aggregation';
import { useAppStore } from '@/store/app-store';

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
  const { meals } = useAppStore();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => getDateKey(new Date()));

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

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.centered}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={{ fontFamily: Fonts.rounded }}>
            Calendar
          </ThemedText>
          <ThemedText>Tap a day to see logged meals.</ThemedText>
        </ThemedView>

        <ThemedView style={[styles.calendarCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.monthHeader}>
            <Pressable onPress={handlePrevMonth} hitSlop={12} style={styles.monthNav}>
              <ThemedText type="defaultSemiBold" style={{ color: theme.accent }}>{'‹'}</ThemedText>
            </Pressable>
            <ThemedText type="defaultSemiBold" style={[styles.monthLabel, { fontFamily: Fonts.rounded }]}>
              {calendar.label}
            </ThemedText>
            <Pressable onPress={handleNextMonth} hitSlop={12} style={styles.monthNav}>
              <ThemedText type="defaultSemiBold" style={{ color: theme.accent }}>{'›'}</ThemedText>
            </Pressable>
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

                return (
                  <Pressable
                    key={dayIndex}
                    style={[
                      styles.dayCell,
                      { backgroundColor: theme.surface },
                      isSelected && { backgroundColor: theme.primary, borderWidth: 2, borderColor: theme.accent },
                      hasCalories && !isSelected && styles.dayCellWithMeals,
                    ]}
                    onPress={() => setSelectedDateKey(day.dateKey)}>
                    <ThemedText
                      type="defaultSemiBold"
                      style={[
                        styles.dayNumber,
                        isSelected && { color: theme.accent },
                        isSelected && { fontFamily: Fonts.rounded },
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
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ThemedView>

        <ThemedView style={[styles.mealsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <ThemedText type="subtitle">Meals on selected day</ThemedText>
          {selectedMeals.length === 0 ? (
            <ThemedText>No meals logged on this day.</ThemedText>
          ) : (
            selectedMeals.map((meal) => (
              <ThemedView
                key={meal.id}
                style={[styles.mealItem, { backgroundColor: theme.surface, borderLeftColor: theme.primary }]}>
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
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: 1,
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  dayCellWithMeals: {
    opacity: 0.95,
  },
  dayNumber: {
    fontSize: 14,
    marginBottom: 2,
  },
  dayCalories: {
    fontSize: 10,
  },
  mealsCard: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
  },
  mealItem: {
    borderRadius: 12,
    padding: 12,
    gap: 4,
    borderLeftWidth: 4,
  },
});
