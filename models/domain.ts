export type MealSource = 'ai' | 'manual' | 'imported';

export type MacroEstimate = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealEntry = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  confidence: number;
  assumptions: string[];
  source: MealSource;
} & MacroEstimate;

export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessageType = 'message' | 'clarification' | 'confirmation';

export type ChatSessionStatus =
  | 'idle'
  | 'awaiting_input'
  | 'awaiting_clarification'
  | 'ready_to_confirm'
  | 'saving'
  | 'saved'
  | 'error';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  type: ChatMessageType;
  createdAt: string;
};

export type MealInterpretationResponse = {
  status: 'ready' | 'clarification_needed';
  normalizedInput: string;
  mealTitle?: string;
  clarificationQuestion?: string;
  clarificationOptions?: string[];
  estimatedMacros?: MacroEstimate;
  confidence: number;
  assumptions: string[];
  matchedFoods?: string[];
};

export type MealDraft = {
  sourceText: string;
  mealTitle: string;
  estimatedMacros: MacroEstimate;
  confidence: number;
  assumptions: string[];
};

export type DailyMacroSummary = {
  dateKey: string;
  totals: MacroEstimate;
  mealCount: number;
};
