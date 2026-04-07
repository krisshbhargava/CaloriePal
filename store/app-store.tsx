import { PropsWithChildren, createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';

import {
  ChatMessage,
  ChatSessionStatus,
  MealDraft,
  MealComponent,
  MealEntry,
  MealInterpretationResponse,
} from '@/models/domain';
import { GroqMessage, interpretMealWithGroq } from '@/services/meal-interpreter';

export type MacroGoals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const DEFAULT_MACRO_GOALS: MacroGoals = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
};

type AppStateContextValue = {
  meals: MealEntry[];
  chatMessages: ChatMessage[];
  chatStatus: ChatSessionStatus;
  chatError: string | null;
  isInterpreting: boolean;
  activeDraft: MealDraft | null;
  pendingInterpretation: MealInterpretationResponse | null;
  lastSavedMeal: MealEntry | null;
  editingMealId: string | null;
  dateNotes: Record<string, string>;
  macroGoals: MacroGoals;
  setMacroGoals: (updates: Partial<MacroGoals>) => void;
  sendMessage: (text: string) => Promise<void>;
  saveMealFromInterpretation: (
    description: string,
    options?: {
      suppressSavedMealModal?: boolean;
      resetChatSessionAfterSave?: boolean;
    }
  ) => MealEntry | null;
  editMeal: (id: string, updates: { title?: string; calories: number; protein: number; carbs: number; fat: number }) => void;
  startEditSession: (meal: MealEntry) => void;
  clearLastSavedMeal: () => void;
  resetChatSession: () => void;
  setDateNote: (dateKey: string, note: string) => void;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

function buildId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeChatMessage(message: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
  return { id: buildId('chat'), createdAt: new Date().toISOString(), ...message };
}

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatStatus, setChatStatus] = useState<ChatSessionStatus>('awaiting_input');
  const [chatError, setChatError] = useState<string | null>(null);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [activeDraft, setActiveDraft] = useState<MealDraft | null>(null);
  const [pendingInterpretation, setPendingInterpretation] = useState<MealInterpretationResponse | null>(null);
  const [lastSavedMeal, setLastSavedMeal] = useState<MealEntry | null>(null);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [dateNotes, setDateNotes] = useState<Record<string, string>>({});
  const [macroGoals, setMacroGoalsState] = useState<MacroGoals>(DEFAULT_MACRO_GOALS);

  const setMacroGoals = useCallback((updates: Partial<MacroGoals>) => {
    setMacroGoalsState((prev) => {
      const next = { ...prev };
      (Object.keys(updates) as (keyof MacroGoals)[]).forEach((key) => {
        const v = updates[key];
        if (typeof v === 'number' && v >= 0) next[key] = Math.round(v);
      });
      return next;
    });
  }, []);

  const setDateNote = useCallback((dateKey: string, note: string) => {
    setDateNotes((prev) => {
      const next = { ...prev };
      const trimmed = note.trim();
      if (trimmed) next[dateKey] = trimmed;
      else delete next[dateKey];
      return next;
    });
  }, []);

  const sessionHistoryRef = useRef<GroqMessage[]>([]);

  const appendChatMessage = useCallback((message: Omit<ChatMessage, 'id' | 'createdAt'>) => {
    setChatMessages((prev) => [...prev, makeChatMessage(message)]);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isInterpreting) return;

      setChatError(null);
      setIsInterpreting(true);
      setChatStatus('awaiting_input');

      appendChatMessage({ role: 'user', text: trimmed, type: 'message' });
      sessionHistoryRef.current = [...sessionHistoryRef.current, { role: 'user', content: trimmed }];

      try {
        const response = await interpretMealWithGroq(sessionHistoryRef.current);
        setPendingInterpretation(response);

        if (response.status === 'clarification_needed') {
          const question = response.clarificationQuestion ?? 'Can you tell me more?';
          appendChatMessage({ role: 'assistant', text: question, type: 'clarification' });
          sessionHistoryRef.current = [
            ...sessionHistoryRef.current,
            { role: 'assistant', content: question },
          ];
          setActiveDraft(null);
          setChatStatus('awaiting_clarification');
        } else {
          const macros = response.estimatedMacros!;
          const componentLines =
            response.components?.length
              ? `\n\nBreakdown:\n${response.components
                  .map(
                    (component) =>
                      `- ${component.quantity ? `${component.quantity} ` : ''}${component.name}: ${component.calories} kcal, ${component.protein}g protein, ${component.carbs}g carbs, ${component.fat}g fat`
                  )
                  .join('\n')}`
              : '';
          const summary = `Got it! Here's my estimate for **${response.mealTitle}**:\n${macros.calories} kcal · ${macros.protein}g protein · ${macros.carbs}g carbs · ${macros.fat}g fat${componentLines}\n\nDoes that look right?`;
          appendChatMessage({ role: 'assistant', text: summary, type: 'confirmation' });
          sessionHistoryRef.current = [
            ...sessionHistoryRef.current,
            { role: 'assistant', content: summary },
          ];
          setActiveDraft({
            sourceText: trimmed,
            mealTitle: response.mealTitle!,
            estimatedMacros: macros,
            components: response.components ?? [],
            confidence: response.confidence,
            assumptions: response.assumptions,
          });
          setChatStatus('ready_to_confirm');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong.';
        setChatError(message);
        setChatStatus('error');
      } finally {
        setIsInterpreting(false);
      }
    },
    [appendChatMessage, isInterpreting]
  );

  const saveMealFromInterpretation = useCallback(
    (
      description: string,
      options?: {
        suppressSavedMealModal?: boolean;
        resetChatSessionAfterSave?: boolean;
      }
    ) => {
      if (!activeDraft || !pendingInterpretation || pendingInterpretation.status !== 'ready') {
        setChatError('No confirmed meal draft is available to save yet.');
        setChatStatus('error');
        return null;
      }

      setChatStatus('saving');

      const meal: MealEntry = {
        id: editingMealId ?? buildId('meal'),
        title: activeDraft.mealTitle,
        description: description.trim() || activeDraft.sourceText,
        timestamp: new Date().toISOString(),
        calories: activeDraft.estimatedMacros.calories,
        protein: activeDraft.estimatedMacros.protein,
        carbs: activeDraft.estimatedMacros.carbs,
        fat: activeDraft.estimatedMacros.fat,
        confidence: activeDraft.confidence,
        assumptions: activeDraft.assumptions,
        components: activeDraft.components,
        source: 'ai',
      };

      if (editingMealId) {
        // Replace the existing meal
        setMeals((prev) => prev.map((m) => (m.id === editingMealId ? meal : m)));
      } else {
        setMeals((prev) => [meal, ...prev]);
      }

      const shouldResetChatSession = Boolean(options?.resetChatSessionAfterSave);

      setPendingInterpretation(null);
      setActiveDraft(null);
      setEditingMealId(null);
      setChatStatus(shouldResetChatSession ? 'awaiting_input' : 'saved');
      setChatError(null);
      setLastSavedMeal(options?.suppressSavedMealModal ? null : meal);

      if (shouldResetChatSession) {
        sessionHistoryRef.current = [];
        setChatMessages([]);
      }

      return meal;
    },
    [activeDraft, pendingInterpretation, editingMealId]
  );

  const editMeal = useCallback(
    (id: string, updates: { title?: string; calories: number; protein: number; carbs: number; fat: number }) => {
      setMeals((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                ...updates,
                components: scaleMealComponents(m.components, m, updates),
              }
            : m
        )
      );
    },
    []
  );

  const startEditSession = useCallback(
    (meal: MealEntry) => {
      // Reset chat state
      setPendingInterpretation(null);
      setActiveDraft(null);
      setChatError(null);
      setChatStatus('awaiting_input');
      setIsInterpreting(false);
      setEditingMealId(meal.id);

      const breakdownContext =
        meal.components.length > 0
          ? ` Breakdown: ${meal.components
              .map(
                (component) =>
                  `${component.quantity ? `${component.quantity} ` : ''}${component.name} (${component.calories} kcal, ${component.protein}g protein, ${component.carbs}g carbs, ${component.fat}g fat)`
              )
              .join('; ')}.`
          : '';
      const contextMessage = `I want to edit a meal I previously logged: "${meal.title}" - ${meal.calories} kcal, ${meal.protein}g protein, ${meal.carbs}g carbs, ${meal.fat}g fat.${breakdownContext}`;
      const assistantGreeting = `Sure! I have your **${meal.title}** logged at ${meal.calories} kcal. What would you like to change?`;

      // Prime the session history with context
      sessionHistoryRef.current = [
        { role: 'user', content: contextMessage },
        { role: 'assistant', content: assistantGreeting },
      ];

      setChatMessages([
        makeChatMessage({ role: 'user', text: contextMessage, type: 'message' }),
        makeChatMessage({ role: 'assistant', text: assistantGreeting, type: 'message' }),
      ]);

      router.push('/(tabs)/log-meal');
    },
    []
  );

  const clearLastSavedMeal = useCallback(() => {
    setLastSavedMeal(null);
    // Also reset the chat so it's ready for the next meal
    setPendingInterpretation(null);
    setActiveDraft(null);
    setChatError(null);
    setChatStatus('awaiting_input');
    setIsInterpreting(false);
    sessionHistoryRef.current = [];
    setChatMessages([]);
  }, []);

  const resetChatSession = useCallback(() => {
    setPendingInterpretation(null);
    setActiveDraft(null);
    setChatError(null);
    setChatStatus('awaiting_input');
    setIsInterpreting(false);
    setEditingMealId(null);
    sessionHistoryRef.current = [];
    setChatMessages([]);
  }, []);

  const value = useMemo<AppStateContextValue>(
    () => ({
      meals,
      chatMessages,
      chatStatus,
      chatError,
      isInterpreting,
      activeDraft,
      pendingInterpretation,
      lastSavedMeal,
      editingMealId,
      dateNotes,
      macroGoals,
      setMacroGoals,
      sendMessage,
      saveMealFromInterpretation,
      editMeal,
      startEditSession,
      clearLastSavedMeal,
      resetChatSession,
      setDateNote,
    }),
    [
      meals,
      chatMessages,
      chatStatus,
      chatError,
      isInterpreting,
      activeDraft,
      pendingInterpretation,
      lastSavedMeal,
      editingMealId,
      dateNotes,
      macroGoals,
      setMacroGoals,
      sendMessage,
      saveMealFromInterpretation,
      editMeal,
      startEditSession,
      clearLastSavedMeal,
      resetChatSession,
      setDateNote,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppStore must be used within AppStoreProvider');
  }
  return context;
}

function scaleMealComponents(
  components: MealComponent[],
  currentTotals: { calories: number; protein: number; carbs: number; fat: number },
  nextTotals: { calories: number; protein: number; carbs: number; fat: number }
): MealComponent[] {
  if (components.length === 0) {
    return [];
  }

  return components.map((component) => ({
    ...component,
    calories: scaleMacroValue(component.calories, currentTotals.calories, nextTotals.calories),
    protein: scaleMacroValue(component.protein, currentTotals.protein, nextTotals.protein),
    carbs: scaleMacroValue(component.carbs, currentTotals.carbs, nextTotals.carbs),
    fat: scaleMacroValue(component.fat, currentTotals.fat, nextTotals.fat),
  }));
}

function scaleMacroValue(value: number, currentTotal: number, nextTotal: number) {
  if (value === 0 || nextTotal === 0) return 0;
  if (currentTotal <= 0) return Math.round(nextTotal);
  return Math.max(0, Math.round((value / currentTotal) * nextTotal));
}
