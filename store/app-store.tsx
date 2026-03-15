import { PropsWithChildren, createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { mockMeals } from '@/data/mock-meals';
import {
  ChatMessage,
  ChatSessionStatus,
  MealDraft,
  MealEntry,
  MealInterpretationResponse,
} from '@/models/domain';
import { GroqMessage, interpretMealWithGroq } from '@/services/ai-meal-interpreter';

type AppStateContextValue = {
  meals: MealEntry[];
  chatMessages: ChatMessage[];
  chatStatus: ChatSessionStatus;
  chatError: string | null;
  isInterpreting: boolean;
  activeDraft: MealDraft | null;
  pendingInterpretation: MealInterpretationResponse | null;
  sendMessage: (text: string) => Promise<void>;
  saveMealFromInterpretation: (description: string) => MealEntry | null;
  resetChatSession: () => void;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

function buildId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeChatMessage(message: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
  return { id: buildId('chat'), createdAt: new Date().toISOString(), ...message };
}

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [meals, setMeals] = useState<MealEntry[]>(mockMeals);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatStatus, setChatStatus] = useState<ChatSessionStatus>('awaiting_input');
  const [chatError, setChatError] = useState<string | null>(null);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [activeDraft, setActiveDraft] = useState<MealDraft | null>(null);
  const [pendingInterpretation, setPendingInterpretation] =
    useState<MealInterpretationResponse | null>(null);

  // Groq/xAI conversation history — reset each session
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

      // Add user message to UI and session history
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
          const summary = `Got it! Here's my estimate for **${response.mealTitle}**:\n${macros.calories} kcal · ${macros.protein}g protein · ${macros.carbs}g carbs · ${macros.fat}g fat\n\nDoes that look right?`;
          appendChatMessage({ role: 'assistant', text: summary, type: 'confirmation' });
          sessionHistoryRef.current = [
            ...sessionHistoryRef.current,
            { role: 'assistant', content: summary },
          ];
          setActiveDraft({
            sourceText: trimmed,
            mealTitle: response.mealTitle!,
            estimatedMacros: macros,
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
    (description: string) => {
      if (!activeDraft || !pendingInterpretation || pendingInterpretation.status !== 'ready') {
        setChatError('No confirmed meal draft is available to save yet.');
        setChatStatus('error');
        return null;
      }

      setChatStatus('saving');

      const meal: MealEntry = {
        id: buildId('meal'),
        title: activeDraft.mealTitle,
        description: description.trim() || activeDraft.sourceText,
        timestamp: new Date().toISOString(),
        calories: activeDraft.estimatedMacros.calories,
        protein: activeDraft.estimatedMacros.protein,
        carbs: activeDraft.estimatedMacros.carbs,
        fat: activeDraft.estimatedMacros.fat,
        confidence: activeDraft.confidence,
        assumptions: activeDraft.assumptions,
        source: 'ai',
      };

      setMeals((prev) => [meal, ...prev]);
      setPendingInterpretation(null);
      setActiveDraft(null);
      setChatStatus('saved');
      setChatError(null);
      appendChatMessage({ role: 'assistant', text: 'Saved! Nice work logging today.', type: 'confirmation' });
      return meal;
    },
    [activeDraft, appendChatMessage, pendingInterpretation]
  );

  const resetChatSession = useCallback(() => {
    setPendingInterpretation(null);
    setActiveDraft(null);
    setChatError(null);
    setChatStatus('awaiting_input');
    setIsInterpreting(false);
    sessionHistoryRef.current = [];
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
      sendMessage,
      saveMealFromInterpretation,
      resetChatSession,
    }),
    [
      meals,
      chatMessages,
      chatStatus,
      chatError,
      isInterpreting,
      activeDraft,
      pendingInterpretation,
      sendMessage,
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
