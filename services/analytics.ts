import { getAnalytics, logEvent } from '@react-native-firebase/analytics';

export function trackMealLogStarted(inputMethod: 'text' | 'voice'): void {
  logEvent(getAnalytics(), 'meal_log_started', { input_method: inputMethod }).catch(() => {});
}

export function trackMealLogCompleted(params: {
  durationSeconds: number;
  clarificationTurns: number;
  inputMethod: 'text' | 'voice';
  calories: number;
}): void {
  logEvent(getAnalytics(), 'meal_log_completed', {
    duration_seconds: params.durationSeconds,
    clarification_turns: params.clarificationTurns,
    input_method: params.inputMethod,
    calories: params.calories,
  }).catch(() => {});
}

export function trackMealLogAbandoned(): void {
  logEvent(getAnalytics(), 'meal_log_abandoned').catch(() => {});
}

export function trackClarificationNeeded(turnNumber: number): void {
  logEvent(getAnalytics(), 'clarification_needed', { turn_number: turnNumber }).catch(() => {});
}

export function trackVoiceModeToggled(enabled: boolean): void {
  logEvent(getAnalytics(), 'voice_mode_toggled', { enabled }).catch(() => {});
}
