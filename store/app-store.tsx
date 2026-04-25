import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ChatMessage,
  ChatSessionStatus,
  MealDraft,
  MealComponent,
  MealEntry,
  MealInterpretationResponse,
} from '@/models/domain';
import { useAuth } from '@/context/auth-context';
import { GroqMessage, interpretMealWithGroq } from '@/services/meal-interpreter';
import {
  PremiumAccessExperimentVariant,
  fetchGoals,
  fetchMeals,
  fetchOrAssignPremiumAccessExperiment,
  fetchNotes,
  recordMealSaved,
  recordSessionAbandoned,
  recordSessionCompleted,
  recordSessionStart,
  saveMeal,
  saveGoals,
  saveNote,
} from '@/services/firestore';
import {
  trackClarificationNeeded,
  trackMealLogAbandoned,
  trackMealLogCompleted,
  trackMealLogStarted,
} from '@/services/analytics';

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

const PREMIUM_MONTHLY_PRICE = '$5.99';
const ALPHA_PAID_KEY = 'alpha_paid_enabled';
const ADMIN_EMAILS = (process.env.EXPO_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const PREMIUM_EMAILS = (process.env.EXPO_PUBLIC_PREMIUM_EMAILS ?? '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

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
  isAdmin: boolean;
  hasPremiumAccess: boolean;
  premiumExperimentVariant: PremiumAccessExperimentVariant | null;
  premiumPrice: string;
  setMacroGoals: (updates: Partial<MacroGoals>) => void;
  switchToPaidForAlpha: () => Promise<void>;
  attachMealPhoto: (mealId: string, photoUri: string) => void;
  setMealRating: (mealId: string, rating: number) => void;
  toggleMealFavorite: (mealId: string) => void;
  sendMessage: (text: string, inputMethod?: 'text' | 'voice') => Promise<void>;
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
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const normalizedEmail = user?.email?.trim().toLowerCase() ?? '';
  const isAdmin = normalizedEmail !== '' && ADMIN_EMAILS.includes(normalizedEmail);
  const [alphaPaidEnabled, setAlphaPaidEnabled] = useState(false);
  const [premiumExperimentVariant, setPremiumExperimentVariant] = useState<PremiumAccessExperimentVariant | null>(null);
  const hasPremiumAccess =
    isAdmin ||
    alphaPaidEnabled ||
    premiumExperimentVariant === 'premium_access' ||
    (normalizedEmail !== '' && PREMIUM_EMAILS.includes(normalizedEmail));

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

  useEffect(() => {
    AsyncStorage.getItem(ALPHA_PAID_KEY)
      .then((value) => setAlphaPaidEnabled(value === 'true'))
      .catch(() => setAlphaPaidEnabled(false));
  }, []);

  // Load all user data from Firestore when the user logs in
  useEffect(() => {
    if (!uid) {
      setMeals([]);
      setDateNotes({});
      setMacroGoalsState(DEFAULT_MACRO_GOALS);
      setPremiumExperimentVariant(null);
      return;
    }
    fetchOrAssignPremiumAccessExperiment(uid)
      .then((assignment) => setPremiumExperimentVariant(assignment.variant))
      .catch((error) => {
        console.error(error);
        setPremiumExperimentVariant(null);
      });
    fetchMeals(uid).then(setMeals).catch(console.error);
    fetchGoals(uid).then((goals) => { if (goals) setMacroGoalsState(goals); }).catch(console.error);
    fetchNotes(uid).then(setDateNotes).catch(console.error);
  }, [uid]);

  const setMacroGoals = useCallback((updates: Partial<MacroGoals>) => {
    setMacroGoalsState((prev) => {
      const next = { ...prev };
      (Object.keys(updates) as (keyof MacroGoals)[]).forEach((key) => {
        const v = updates[key];
        if (typeof v === 'number' && v >= 0) next[key] = Math.round(v);
      });
      if (uid) saveGoals(uid, next).catch(console.error);
      return next;
    });
  }, [uid]);

  const switchToPaidForAlpha = useCallback(async () => {
    setAlphaPaidEnabled(true);
    await AsyncStorage.setItem(ALPHA_PAID_KEY, 'true');
  }, []);

  const setDateNote = useCallback((dateKey: string, note: string) => {
    setDateNotes((prev) => {
      const next = { ...prev };
      const trimmed = note.trim();
      if (trimmed) next[dateKey] = trimmed;
      else delete next[dateKey];
      if (uid) saveNote(uid, dateKey, note).catch(console.error);
      return next;
    });
  }, [uid]);

  const sessionHistoryRef = useRef<GroqMessage[]>([]);
  const sessionStartTimeRef = useRef<number | null>(null);
  const sessionInputMethodRef = useRef<'text' | 'voice'>('text');
  const clarificationTurnsRef = useRef<number>(0);

  const appendChatMessage = useCallback((message: Omit<ChatMessage, 'id' | 'createdAt'>) => {
    setChatMessages((prev) => [...prev, makeChatMessage(message)]);
  }, []);

  const sendMessage = useCallback(
    async (text: string, inputMethod: 'text' | 'voice' = 'text') => {
      const trimmed = text.trim();
      if (!trimmed || isInterpreting) return;

      // Track session start on first message
      if (sessionHistoryRef.current.length === 0) {
        sessionStartTimeRef.current = Date.now();
        sessionInputMethodRef.current = inputMethod;
        trackMealLogStarted(inputMethod);
        if (uid) recordSessionStart(uid, inputMethod, user?.email ?? undefined, premiumExperimentVariant ?? undefined).catch(console.error);
      }

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
          clarificationTurnsRef.current += 1;
          trackClarificationNeeded(clarificationTurnsRef.current);
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
    [appendChatMessage, isInterpreting, uid, user, premiumExperimentVariant]
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

      const existingMeal = editingMealId ? meals.find((candidate) => candidate.id === editingMealId) : null;

      const meal: MealEntry = {
        id: editingMealId ?? buildId('meal'),
        title: activeDraft.mealTitle,
        description: description.trim() || activeDraft.sourceText,
        timestamp: new Date().toISOString(),
        photoUri: existingMeal?.photoUri,
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

      if (uid) saveMeal(uid, meal).catch(console.error);

      const durationSeconds = sessionStartTimeRef.current
        ? Math.round((Date.now() - sessionStartTimeRef.current) / 1000)
        : 0;

      if (uid) {
        recordMealSaved(uid, meal.calories, premiumExperimentVariant ?? undefined).catch(console.error);
        recordSessionCompleted(uid, clarificationTurnsRef.current, durationSeconds, premiumExperimentVariant ?? undefined).catch(console.error);
      }
      trackMealLogCompleted({
        durationSeconds,
        clarificationTurns: clarificationTurnsRef.current,
        inputMethod: sessionInputMethodRef.current,
        calories: meal.calories,
      });
      sessionStartTimeRef.current = null;
      clarificationTurnsRef.current = 0;

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
    [activeDraft, pendingInterpretation, editingMealId, meals, uid]
  );

  const attachMealPhoto = useCallback(
    (mealId: string, photoUri: string) => {
      setMeals((prev) => {
        const next = prev.map((meal) => (meal.id === mealId ? { ...meal, photoUri } : meal));
        if (uid) {
          const updated = next.find((meal) => meal.id === mealId);
          if (updated) {
            saveMeal(uid, updated).catch(console.error);
          }
        }
        return next;
      });
    },
    [uid]
  );

  const setMealRating = useCallback(
    (mealId: string, rating: number) => {
      setMeals((prev) => {
        const boundedRating = Math.max(1, Math.min(5, Math.round(rating)));
        const next = prev.map((meal) => (meal.id === mealId ? { ...meal, rating: boundedRating } : meal));
        if (uid) {
          const updated = next.find((meal) => meal.id === mealId);
          if (updated) saveMeal(uid, updated).catch(console.error);
        }
        return next;
      });
    },
    [uid]
  );

  const toggleMealFavorite = useCallback(
    (mealId: string) => {
      setMeals((prev) => {
        const next = prev.map((meal) =>
          meal.id === mealId ? { ...meal, isFavorite: !meal.isFavorite } : meal
        );
        if (uid) {
          const updated = next.find((meal) => meal.id === mealId);
          if (updated) saveMeal(uid, updated).catch(console.error);
        }
        return next;
      });
    },
    [uid]
  );

  const editMeal = useCallback(
    (id: string, updates: { title?: string; calories: number; protein: number; carbs: number; fat: number }) => {
      setMeals((prev) => {
        const next = prev.map((m) =>
          m.id === id
            ? {
                ...m,
                ...updates,
                components: scaleMealComponents(m.components, m, updates),
              }
            : m
        );
        if (uid) {
          const updated = next.find((m) => m.id === id);
          if (updated) saveMeal(uid, updated).catch(console.error);
        }
        return next;
      });
    },
    [uid]
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

      sessionStartTimeRef.current = Date.now();
      sessionInputMethodRef.current = 'text';
      if (uid) recordSessionStart(uid, 'text', user?.email ?? undefined, premiumExperimentVariant ?? undefined).catch(console.error);

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
    [uid, user?.email]
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
    if (activeDraft !== null || pendingInterpretation !== null) {
      trackMealLogAbandoned();
      recordSessionAbandoned(uid ?? undefined).catch(console.error);
    }
    sessionStartTimeRef.current = null;
    clarificationTurnsRef.current = 0;
    sessionInputMethodRef.current = 'text';
    setPendingInterpretation(null);
    setActiveDraft(null);
    setChatError(null);
    setChatStatus('awaiting_input');
    setIsInterpreting(false);
    setEditingMealId(null);
    sessionHistoryRef.current = [];
    setChatMessages([]);
  }, [activeDraft, pendingInterpretation, uid]);

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
      isAdmin,
      hasPremiumAccess,
      premiumExperimentVariant,
      premiumPrice: PREMIUM_MONTHLY_PRICE,
      setMacroGoals,
      switchToPaidForAlpha,
      attachMealPhoto,
      setMealRating,
      toggleMealFavorite,
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
      isAdmin,
      hasPremiumAccess,
      premiumExperimentVariant,
      setMacroGoals,
      switchToPaidForAlpha,
      attachMealPhoto,
      setMealRating,
      toggleMealFavorite,
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
