import { MealComponent, MealInterpretationResponse } from '@/models/domain';

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';
const XAI_MODEL = 'grok-3-mini';

const SYSTEM_PROMPT = `You are a calorie tracking assistant helping users log meals accurately through a short conversation.

Default to giving an estimate as soon as the user has provided enough information for a reasonable calorie and macro estimate.
Only ask a clarification question when the missing detail could make a significant difference to the estimate or meal composition.
Examples of significant differences include:
- Sauces, dressings, or condiments that could add meaningful calories
- Cooking method when fried vs. grilled or baked would materially change the estimate
- Portion size when the amount is too vague to estimate confidently
- Missing sides or accompaniments that seem likely but are not yet confirmed
- Restaurant or fast food vs. homemade when that would materially change calorie density

Do not ask follow-up questions just to be thorough. If the likely impact is small, make a reasonable assumption and include it in assumptions.
Ask at most one focused clarification at a time, and keep the total number of clarification turns as low as possible.

When you need more information, respond with ONLY this JSON (no other text, no markdown):
{"status":"clarification_needed","question":"your specific question","options":["option A","option B","option C","option D"]}

Option guidelines:
- Make options specific and realistic for the food mentioned
- Include a "None" or "No sauce" option where relevant
- Always include "Other / I'll describe" as the last option so the user can type freely
- Typically 3-5 options

When you have enough detail to estimate, respond with ONLY this JSON (no other text, no markdown):
{"status":"ready","mealTitle":"short descriptive title","calories":0,"protein":0,"carbs":0,"fat":0,"assumptions":["assumption 1","assumption 2"],"components":[{"name":"whole wheat bread","quantity":"2 slices","calories":0,"protein":0,"carbs":0,"fat":0}]}

Rules:
- Always respond with valid JSON only, with no preamble, explanation, or markdown fences
- Protein, carbs, fat are in grams; calories in kcal
- assumptions should list the key portion sizes and defaults you used
- For ready responses, include a components array with the major calorie contributors broken out separately
- Each component should be a specific ingredient or sub-item with its own quantity and macros
- The component totals should add up as closely as possible to the meal totals`;

export type GroqMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type XAIReadyResponse = {
  status: 'ready';
  mealTitle: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  assumptions: string[];
  components?: Array<{
    name: string;
    quantity?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
};

type XAIClarificationResponse = {
  status: 'clarification_needed';
  question: string;
  options: string[];
};

type XAIStructuredResponse = XAIReadyResponse | XAIClarificationResponse;

export async function interpretMealWithGroq(
  sessionHistory: GroqMessage[]
): Promise<MealInterpretationResponse> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    throw new Error('EXPO_PUBLIC_GROQ_API_KEY is not set in your .env file. Add your xAI key.');
  }

  const response = await fetch(XAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...sessionHistory],
      temperature: 0.3,
      max_tokens: 768,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`xAI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const rawContent: string = data.choices?.[0]?.message?.content ?? '';
  const cleaned = rawContent.replace(/```(?:json)?/g, '').trim();

  let parsed: XAIStructuredResponse;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Could not parse model response as JSON: ${rawContent}`);
  }

  const lastUserMessage =
    [...sessionHistory].reverse().find((m) => m.role === 'user')?.content ?? '';

  if (parsed.status === 'ready') {
    const estimatedMacros = {
      calories: Math.round(parsed.calories),
      protein: Math.round(parsed.protein),
      carbs: Math.round(parsed.carbs),
      fat: Math.round(parsed.fat),
    };

    return {
      status: 'ready',
      normalizedInput: lastUserMessage,
      mealTitle: parsed.mealTitle,
      estimatedMacros,
      components: normalizeComponents(parsed.components, estimatedMacros),
      confidence: 0.85,
      assumptions: parsed.assumptions,
    };
  }

  return {
    status: 'clarification_needed',
    normalizedInput: lastUserMessage,
    clarificationQuestion: parsed.question,
    clarificationOptions: parsed.options,
    confidence: 0.6,
    assumptions: [],
  };
}

function normalizeComponents(
  rawComponents: XAIReadyResponse['components'],
  fallbackTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }
): MealComponent[] {
  const normalized =
    rawComponents
      ?.map((component) => ({
        name: component.name?.trim(),
        quantity: component.quantity?.trim() ?? '',
        calories: Math.max(0, Math.round(component.calories)),
        protein: Math.max(0, Math.round(component.protein)),
        carbs: Math.max(0, Math.round(component.carbs)),
        fat: Math.max(0, Math.round(component.fat)),
      }))
      .filter((component): component is MealComponent => Boolean(component.name)) ?? [];

  if (normalized.length > 0) {
    return normalized;
  }

  return [
    {
      name: 'meal total',
      quantity: '',
      ...fallbackTotals,
    },
  ];
}
