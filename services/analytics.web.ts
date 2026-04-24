import { Analytics, getAnalytics, isSupported, logEvent } from 'firebase/analytics';

import { app } from './firebase';

let analyticsInstance: Analytics | null = null;

async function getAnalyticsInstance(): Promise<Analytics | null> {
  if (analyticsInstance) return analyticsInstance;
  try {
    if (!(await isSupported())) return null;
    analyticsInstance = getAnalytics(app);
    return analyticsInstance;
  } catch {
    return null;
  }
}

function fireEvent(eventName: string, params?: Record<string, unknown>): void {
  getAnalyticsInstance()
    .then((instance) => {
      if (instance) logEvent(instance, eventName, params);
    })
    .catch(() => {});
}

export function trackMealLogStarted(inputMethod: 'text' | 'voice'): void {
  fireEvent('meal_log_started', { input_method: inputMethod });
}

export function trackMealLogCompleted(params: {
  durationSeconds: number;
  clarificationTurns: number;
  inputMethod: 'text' | 'voice';
  calories: number;
}): void {
  fireEvent('meal_log_completed', {
    duration_seconds: params.durationSeconds,
    clarification_turns: params.clarificationTurns,
    input_method: params.inputMethod,
    calories: params.calories,
  });
}

export function trackMealLogAbandoned(): void {
  fireEvent('meal_log_abandoned');
}

export function trackClarificationNeeded(turnNumber: number): void {
  fireEvent('clarification_needed', { turn_number: turnNumber });
}

export function trackVoiceModeToggled(enabled: boolean): void {
  fireEvent('voice_mode_toggled', { enabled });
}
