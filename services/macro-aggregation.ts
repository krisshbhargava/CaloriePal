import { DailyMacroSummary, MacroEstimate, MealEntry } from '@/models/domain';

const EMPTY_MACROS: MacroEstimate = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

export function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function sumMacros(items: Array<Pick<MealEntry, 'calories' | 'protein' | 'carbs' | 'fat'>>): MacroEstimate {
  return items.reduce<MacroEstimate>(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    EMPTY_MACROS
  );
}

export function getDailyMacroSummary(meals: MealEntry[], date: Date): DailyMacroSummary {
  const dateKey = getDateKey(date);
  const dailyMeals = meals.filter((meal) => meal.timestamp.slice(0, 10) === dateKey);

  return {
    dateKey,
    totals: sumMacros(dailyMeals),
    mealCount: dailyMeals.length,
  };
}

export function getWeeklyMacroSummaries(meals: MealEntry[], referenceDate = new Date()): DailyMacroSummary[] {
  const days: DailyMacroSummary[] = [];

  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(referenceDate);
    day.setDate(referenceDate.getDate() - i);
    days.push(getDailyMacroSummary(meals, day));
  }

  return days;
}
