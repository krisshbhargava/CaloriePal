import { MealEntry } from '@/models/domain';

const now = new Date();

function daysAgo(days: number, hour: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

export const mockMeals: MealEntry[] = [
  {
    id: 'meal-1',
    title: 'Greek Yogurt Bowl',
    description: 'Greek yogurt with banana, granola, and honey',
    timestamp: daysAgo(0, 9),
    calories: 420,
    protein: 24,
    carbs: 52,
    fat: 12,
    confidence: 0.86,
    assumptions: ['1 cup yogurt', '1 medium banana', '1/3 cup granola'],
    source: 'ai',
  },
  {
    id: 'meal-2',
    title: 'Chicken Rice Bowl',
    description: 'Grilled chicken breast with rice and sauteed veggies',
    timestamp: daysAgo(0, 14),
    calories: 610,
    protein: 44,
    carbs: 68,
    fat: 16,
    confidence: 0.81,
    assumptions: ['6 oz chicken', '1.5 cups cooked rice'],
    source: 'ai',
  },
  {
    id: 'meal-3',
    title: 'Avocado Toast',
    description: 'Two slices whole wheat toast with avocado and egg',
    timestamp: daysAgo(1, 10),
    calories: 480,
    protein: 19,
    carbs: 39,
    fat: 26,
    confidence: 0.83,
    assumptions: ['2 eggs', '1/2 avocado', '2 slices bread'],
    source: 'ai',
  },
  {
    id: 'meal-4',
    title: 'Turkey Sandwich',
    description: 'Turkey sandwich with cheese, tomato, and mustard',
    timestamp: daysAgo(3, 13),
    calories: 530,
    protein: 33,
    carbs: 44,
    fat: 22,
    confidence: 0.77,
    assumptions: ['3 oz turkey', '2 slices bread', '1 slice cheese'],
    source: 'ai',
  },
  {
    id: 'meal-5',
    title: 'Paneer Wrap',
    description: 'Whole wheat wrap with paneer, peppers, and chutney',
    timestamp: daysAgo(5, 20),
    calories: 560,
    protein: 28,
    carbs: 46,
    fat: 30,
    confidence: 0.72,
    assumptions: ['120g paneer', '1 wrap', '1 tbsp oil'],
    source: 'ai',
  },
];
