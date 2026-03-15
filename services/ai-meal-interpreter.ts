import { MacroEstimate, MealInterpretationResponse } from '@/models/domain';

type FoodMacroTemplate = {
  key: string;
  aliases: string[];
  defaultServing: string;
  macros: MacroEstimate;
};

const FOOD_LIBRARY: FoodMacroTemplate[] = [
  {
    key: 'chicken',
    aliases: ['chicken', 'grilled chicken', 'chicken breast'],
    defaultServing: '120g cooked',
    macros: { calories: 320, protein: 40, carbs: 0, fat: 12 },
  },
  {
    key: 'rice',
    aliases: ['rice', 'brown rice', 'white rice'],
    defaultServing: '1 cup cooked',
    macros: { calories: 240, protein: 4, carbs: 53, fat: 1 },
  },
  {
    key: 'paneer',
    aliases: ['paneer'],
    defaultServing: '120g',
    macros: { calories: 360, protein: 22, carbs: 6, fat: 28 },
  },
  {
    key: 'egg',
    aliases: ['egg', 'eggs', 'omelette'],
    defaultServing: '2 eggs',
    macros: { calories: 140, protein: 12, carbs: 1, fat: 9 },
  },
  {
    key: 'oats',
    aliases: ['oats', 'oatmeal'],
    defaultServing: '1 bowl',
    macros: { calories: 220, protein: 7, carbs: 38, fat: 4 },
  },
  {
    key: 'banana',
    aliases: ['banana'],
    defaultServing: '1 medium',
    macros: { calories: 105, protein: 1, carbs: 27, fat: 0 },
  },
  {
    key: 'yogurt',
    aliases: ['yogurt', 'curd', 'greek yogurt'],
    defaultServing: '1 cup',
    macros: { calories: 150, protein: 15, carbs: 12, fat: 4 },
  },
  {
    key: 'bread',
    aliases: ['bread', 'toast'],
    defaultServing: '2 slices',
    macros: { calories: 160, protein: 6, carbs: 28, fat: 2 },
  },
  {
    key: 'avocado',
    aliases: ['avocado'],
    defaultServing: '1/2 avocado',
    macros: { calories: 160, protein: 2, carbs: 9, fat: 15 },
  },
  {
    key: 'salad',
    aliases: ['salad'],
    defaultServing: '1 bowl',
    macros: { calories: 120, protein: 4, carbs: 10, fat: 7 },
  },
];

function clampConfidence(value: number): number {
  return Math.max(0.55, Math.min(0.95, value));
}

function normalizeInput(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function inferQuantity(input: string, alias: string): number {
  const quantityPattern = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:x|servings?|cups?|slices?|pieces?)?\\s+${escapeRegExp(alias)}`);
  const numericMatch = input.match(quantityPattern);
  if (numericMatch) {
    const parsed = Number.parseFloat(numericMatch[1]);
    if (Number.isFinite(parsed)) {
      return Math.max(0.5, Math.min(4, parsed));
    }
  }

  const halfPattern = new RegExp(`half\\s+${escapeRegExp(alias)}`);
  if (halfPattern.test(input)) {
    return 0.5;
  }

  const doublePattern = new RegExp(`double\\s+${escapeRegExp(alias)}`);
  if (doublePattern.test(input)) {
    return 2;
  }

  const largePattern = new RegExp(`large\\s+${escapeRegExp(alias)}`);
  if (largePattern.test(input)) {
    return 1.3;
  }

  const smallPattern = new RegExp(`small\\s+${escapeRegExp(alias)}`);
  if (smallPattern.test(input)) {
    return 0.8;
  }

  return 1;
}

function roundMacroEstimate(value: MacroEstimate): MacroEstimate {
  return {
    calories: Math.round(value.calories),
    protein: Math.round(value.protein),
    carbs: Math.round(value.carbs),
    fat: Math.round(value.fat),
  };
}

export function interpretMealMessage(text: string): MealInterpretationResponse {
  const input = normalizeInput(text);

  if (!input) {
    return {
      status: 'clarification_needed',
      normalizedInput: input,
      clarificationQuestion: 'What did you eat? You can describe it casually.',
      clarificationOptions: ['Example: chicken rice bowl', 'Example: oats with banana'],
      confidence: 0.55,
      assumptions: [],
    };
  }

  const matches = FOOD_LIBRARY
    .map((food) => {
      const matchedAlias = food.aliases.find((alias) => input.includes(alias));
      if (!matchedAlias) {
        return null;
      }

      return {
        food,
        matchedAlias,
        quantity: inferQuantity(input, matchedAlias),
      };
    })
    .filter((match): match is { food: FoodMacroTemplate; matchedAlias: string; quantity: number } =>
      Boolean(match)
    );

  if (matches.length === 0) {
    return {
      status: 'clarification_needed',
      normalizedInput: input,
      clarificationQuestion: 'Can you share the main ingredients or portion size?',
      clarificationOptions: ['List main ingredients', 'Add rough quantity (for example: 2 eggs)'],
      confidence: 0.58,
      assumptions: ['No strong food keyword match'],
    };
  }

  const estimated = matches.reduce<MacroEstimate>(
    (acc, match) => ({
      calories: acc.calories + match.food.macros.calories * match.quantity,
      protein: acc.protein + match.food.macros.protein * match.quantity,
      carbs: acc.carbs + match.food.macros.carbs * match.quantity,
      fat: acc.fat + match.food.macros.fat * match.quantity,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const explicitQuantityCount = matches.filter((match) => match.quantity !== 1).length;
  const confidence = clampConfidence(0.66 + matches.length * 0.06 + explicitQuantityCount * 0.03);

  const assumptions = matches.map(
    (match) => `${match.quantity}x ${match.food.key} (default serving: ${match.food.defaultServing})`
  );

  return {
    status: 'ready',
    normalizedInput: input,
    mealTitle: matches.map((match) => match.food.key).join(' + '),
    estimatedMacros: roundMacroEstimate(estimated),
    confidence,
    assumptions,
    matchedFoods: matches.map((match) => match.food.key),
  };
}
