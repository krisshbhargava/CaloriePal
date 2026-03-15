import { PropsWithChildren, createContext, useCallback, useContext, useMemo, useState } from 'react';

import { mockMeals } from '@/data/mock-meals';
import {
    ChatMessage,
    ChatSessionStatus,
    MealDraft,
    MealEntry,
    MealInterpretationResponse,
} from '@/models/domain';
import { interpretMealMessage } from '@/services/ai-meal-interpreter';

type SaveMealInput = {
  description: string;
  title?: string;
};

type AppStateContextValue = {
  meals: MealEntry[];
  chatMessages: ChatMessage[];
  chatStatus: ChatSessionStatus;
  chatError: string | null;
  activeDraft: MealDraft | null;
  lastUserInput: string;
  pendingInterpretation: MealInterpretationResponse | null;
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'createdAt'>) => void;
  requestMealInterpretation: (text: string) => MealInterpretationResponse;
  chooseClarificationOption: (optionText: string) => MealInterpretationResponse;
  saveMealFromInterpretation: (input: SaveMealInput) => MealEntry | null;
  resetChatSession: () => void;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

function buildId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [meals, setMeals] = useState<MealEntry[]>(mockMeals);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatStatus, setChatStatus] = useState<ChatSessionStatus>('awaiting_input');
  const [chatError, setChatError] = useState<string | null>(null);
  const [activeDraft, setActiveDraft] = useState<MealDraft | null>(null);
  const [lastUserInput, setLastUserInput] = useState('');
  const [pendingInterpretation, setPendingInterpretation] =
    useState<MealInterpretationResponse | null>(null);

  const addChatMessage = useCallback((message: Omit<ChatMessage, 'id' | 'createdAt'>) => {
    const newMessage: ChatMessage = {
      id: buildId('chat'),
      createdAt: new Date().toISOString(),
      ...message,
    };

    setChatMessages((previous) => [...previous, newMessage]);
  }, []);

  const requestMealInterpretation = useCallback(
    (text: string) => {
      const trimmedText = text.trim();
      setChatError(null);

      if (trimmedText.length < 4) {
        const response: MealInterpretationResponse = {
          status: 'clarification_needed',
          normalizedInput: trimmedText.toLowerCase(),
          clarificationQuestion: 'Please add a little more detail so I can estimate macros.',
          clarificationOptions: ['Include ingredient names', 'Add rough quantity'],
          confidence: 0.55,
          assumptions: ['Input was too short'],
        };

        setPendingInterpretation(response);
        setActiveDraft(null);
        setChatStatus('awaiting_clarification');
        return response;
      }

      addChatMessage({ role: 'user', text: trimmedText, type: 'message' });
      setLastUserInput(trimmedText);

      const response = interpretMealMessage(trimmedText);
      setPendingInterpretation(response);

      if (response.status === 'clarification_needed') {
        setActiveDraft(null);
        setChatStatus('awaiting_clarification');
        addChatMessage({
          role: 'assistant',
          text: response.clarificationQuestion ?? 'Could you clarify a bit more?',
          type: 'clarification',
        });
      } else {
        const estimated = response.estimatedMacros;
        if (!estimated || !response.mealTitle) {
          setChatStatus('error');
          setChatError('Estimate payload incomplete. Please try describing the meal again.');
          return {
            status: 'clarification_needed',
            normalizedInput: response.normalizedInput,
            clarificationQuestion: 'I need one more detail before saving. Could you rephrase the meal?',
            clarificationOptions: ['Retry with ingredients'],
            confidence: 0.55,
            assumptions: ['Interpreter returned missing fields'],
          };
        }

        setActiveDraft({
          sourceText: trimmedText,
          mealTitle: response.mealTitle,
          estimatedMacros: estimated,
          confidence: response.confidence,
          assumptions: response.assumptions,
        });
        setChatStatus('ready_to_confirm');
        addChatMessage({
          role: 'assistant',
          text: `Estimated: ${estimated.calories} kcal. Confirm to save.`,
          type: 'confirmation',
        });
      }

      return response;
    },
    [addChatMessage]
  );

  const chooseClarificationOption = useCallback(
    (optionText: string) => {
      const composedInput = `${lastUserInput} ${optionText}`.trim();
      return requestMealInterpretation(composedInput || optionText);
    },
    [lastUserInput, requestMealInterpretation]
  );

  const saveMealFromInterpretation = useCallback(
    (input: SaveMealInput) => {
      if (!pendingInterpretation || pendingInterpretation.status !== 'ready' || !activeDraft) {
        setChatStatus('error');
        setChatError('No confirmed meal draft is available to save yet.');
        return null;
      }

      setChatStatus('saving');

      const meal: MealEntry = {
        id: buildId('meal'),
        title: input.title ?? activeDraft.mealTitle,
        description: input.description.trim() || activeDraft.sourceText,
        timestamp: new Date().toISOString(),
        calories: activeDraft.estimatedMacros.calories,
        protein: activeDraft.estimatedMacros.protein,
        carbs: activeDraft.estimatedMacros.carbs,
        fat: activeDraft.estimatedMacros.fat,
        confidence: activeDraft.confidence,
        assumptions: activeDraft.assumptions,
        source: 'ai',
      };

      setMeals((previous) => [meal, ...previous]);
      setPendingInterpretation(null);
      setActiveDraft(null);
      setChatStatus('saved');
      setChatError(null);
      addChatMessage({ role: 'assistant', text: 'Saved. Nice work logging today.', type: 'confirmation' });
      return meal;
    },
    [activeDraft, addChatMessage, pendingInterpretation]
  );

  const resetChatSession = useCallback(() => {
    setPendingInterpretation(null);
    setActiveDraft(null);
    setChatError(null);
    setLastUserInput('');
    setChatStatus('awaiting_input');
  }, []);

  const value = useMemo<AppStateContextValue>(
    () => ({
      meals,
      chatMessages,
      chatStatus,
      chatError,
      activeDraft,
      lastUserInput,
      pendingInterpretation,
      addChatMessage,
      requestMealInterpretation,
      chooseClarificationOption,
      saveMealFromInterpretation,
      resetChatSession,
    }),
    [
      activeDraft,
      addChatMessage,
      chatError,
      chatMessages,
      chatStatus,
      lastUserInput,
      meals,
      pendingInterpretation,
      requestMealInterpretation,
      chooseClarificationOption,
      saveMealFromInterpretation,
      resetChatSession,
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
