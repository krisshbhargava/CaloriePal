import { MealInterpretationResponse } from '@/models/domain';

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';
const XAI_MODEL = 'grok-3-mini';

const SYSTEM_PROMPT = `You are a calorie tracking assistant. When a user describes food they ate, estimate the macros accurately.

If you have enough information to estimate, respond with ONLY this JSON (no other text, no markdown):
{"status":"ready","mealTitle":"short descriptive title","calories":0,"protein":0,"carbs":0,"fat":0,"assumptions":["assumption 1","assumption 2"]}

If you need more information (portion size, cooking method, specific ingredients), respond with ONLY this JSON (no other text, no markdown):
{"status":"clarification_needed","question":"your question here","options":["option 1","option 2","option 3"]}

Rules:
- Always respond with valid JSON only — no preamble, no explanation, no markdown fences
- Make reasonable default assumptions for typical portion sizes when possible rather than always asking
- Ask at most one clarifying question before committing to an estimate
- Protein, carbs, fat are in grams; calories in kcal
- assumptions should explain what portion sizes or defaults you used`;

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
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`xAI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const rawContent: string = data.choices?.[0]?.message?.content ?? '';

  // Strip accidental markdown fences if the model ignores instructions
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
    return {
      status: 'ready',
      normalizedInput: lastUserMessage,
      mealTitle: parsed.mealTitle,
      estimatedMacros: {
        calories: Math.round(parsed.calories),
        protein: Math.round(parsed.protein),
        carbs: Math.round(parsed.carbs),
        fat: Math.round(parsed.fat),
      },
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
