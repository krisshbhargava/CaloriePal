import type { MacroGoals } from '@/store/app-store';

export type MacroPriority =
  | 'lose_weight'
  | 'maintain'
  | 'gain_muscle'
  | 'improve_health'
  | 'athletic_performance';

export type Sex = 'male' | 'female' | 'other';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type UserProfile = {
  priority: MacroPriority;
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  onboardingCompleted: boolean;
  completedAt?: string;
};

export const PRIORITY_OPTIONS: {
  id: MacroPriority;
  title: string;
  description: string;
}[] = [
  {
    id: 'lose_weight',
    title: 'Lose weight',
    description: 'Trim down with a sustainable calorie deficit.',
  },
  {
    id: 'maintain',
    title: 'Maintain',
    description: 'Stay at your current weight and eat in balance.',
  },
  {
    id: 'gain_muscle',
    title: 'Gain muscle',
    description: 'Build strength with a slight calorie surplus.',
  },
  {
    id: 'improve_health',
    title: 'Eat healthier',
    description: 'Focus on whole foods and balanced macros.',
  },
  {
    id: 'athletic_performance',
    title: 'Fuel performance',
    description: 'Higher carb intake to power workouts.',
  },
];

export const ACTIVITY_OPTIONS: {
  id: ActivityLevel;
  title: string;
  description: string;
  multiplier: number;
}[] = [
  { id: 'sedentary', title: 'Sedentary', description: 'Little to no exercise', multiplier: 1.2 },
  { id: 'light', title: 'Lightly active', description: '1–3 workouts / week', multiplier: 1.375 },
  { id: 'moderate', title: 'Moderately active', description: '3–5 workouts / week', multiplier: 1.55 },
  { id: 'active', title: 'Very active', description: '6–7 workouts / week', multiplier: 1.725 },
  { id: 'very_active', title: 'Extra active', description: 'Hard daily training', multiplier: 1.9 },
];

const PRIORITY_CALORIE_OFFSET: Record<MacroPriority, number> = {
  lose_weight: -500,
  maintain: 0,
  gain_muscle: 300,
  improve_health: 0,
  athletic_performance: 200,
};

const PRIORITY_MACRO_SPLIT: Record<MacroPriority, { protein: number; carbs: number; fat: number }> = {
  lose_weight: { protein: 0.35, carbs: 0.35, fat: 0.3 },
  maintain: { protein: 0.25, carbs: 0.45, fat: 0.3 },
  gain_muscle: { protein: 0.3, carbs: 0.45, fat: 0.25 },
  improve_health: { protein: 0.25, carbs: 0.5, fat: 0.25 },
  athletic_performance: { protein: 0.25, carbs: 0.55, fat: 0.2 },
};

// Mifflin–St Jeor BMR estimate adjusted by activity factor and priority offset.
export function calculateSuggestedMacros(
  profile: Pick<UserProfile, 'sex' | 'age' | 'weightKg' | 'heightCm' | 'activityLevel' | 'priority'>
): MacroGoals {
  const { sex, age, weightKg, heightCm, activityLevel, priority } = profile;

  const bmrBase = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const sexAdjustment = sex === 'male' ? 5 : sex === 'female' ? -161 : -78;
  const bmr = bmrBase + sexAdjustment;

  const multiplier = ACTIVITY_OPTIONS.find((option) => option.id === activityLevel)?.multiplier ?? 1.4;
  const tdee = bmr * multiplier;
  const targetCalories = Math.max(1200, Math.round(tdee + PRIORITY_CALORIE_OFFSET[priority]));

  const split = PRIORITY_MACRO_SPLIT[priority];
  const proteinG = Math.round((targetCalories * split.protein) / 4);
  const carbsG = Math.round((targetCalories * split.carbs) / 4);
  const fatG = Math.round((targetCalories * split.fat) / 9);

  return {
    calories: targetCalories,
    protein: proteinG,
    carbs: carbsG,
    fat: fatG,
  };
}
