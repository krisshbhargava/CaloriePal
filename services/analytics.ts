import { getAnalytics, logEvent } from '@react-native-firebase/analytics';
import { trackABEvent } from './local-ab-tracker';

export function trackMealLogStarted(inputMethod: 'text' | 'voice'): void {
  const params = { input_method: inputMethod };
  logEvent(getAnalytics(), 'meal_log_started', params).catch(() => {});
  trackABEvent('meal_log_started', params);
}

export function trackMealLogCompleted(params: {
  durationSeconds: number;
  clarificationTurns: number;
  inputMethod: 'text' | 'voice';
  calories: number;
}): void {
  const firebaseParams = {
    duration_seconds: params.durationSeconds,
    clarification_turns: params.clarificationTurns,
    input_method: params.inputMethod,
    calories: params.calories,
  };
  logEvent(getAnalytics(), 'meal_log_completed', firebaseParams).catch(() => {});
  trackABEvent('meal_log_completed', firebaseParams);
}

export function trackMealLogAbandoned(): void {
  logEvent(getAnalytics(), 'meal_log_abandoned').catch(() => {});
  trackABEvent('meal_log_abandoned');
}

export function trackClarificationNeeded(turnNumber: number): void {
  const params = { turn_number: turnNumber };
  logEvent(getAnalytics(), 'clarification_needed', params).catch(() => {});
  trackABEvent('clarification_needed', params);
}

export function trackVoiceModeToggled(enabled: boolean): void {
  const params = { enabled };
  logEvent(getAnalytics(), 'voice_mode_toggled', params).catch(() => {});
  trackABEvent('voice_mode_toggled', params);
}
