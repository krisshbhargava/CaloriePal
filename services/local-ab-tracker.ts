import Constants from 'expo-constants';

export type Variant = 'control' | 'treatment';

type UserSession = {
  variant: Variant;
  mealsStarted: number;
  mealsCompleted: number;
  mealsAbandoned: number;
  voiceSessions: number;
  textSessions: number;
  voiceToggles: number;
  totalDurationSeconds: number;
  completedAt: string;
};

// In-memory store
let completedSessions: UserSession[] = [];
let currentSession: UserSession | null = null;
let assignedVariant: Variant | null = null;

function variantForDevice(): Variant {
  const name = Constants.deviceName ?? '';
  if (name.includes('iPhone 15')) return 'control';
  if (name.includes('iPhone 17')) return 'treatment';
  return Math.random() < 0.5 ? 'control' : 'treatment';
}

export function getOrAssignVariant(): Variant {
  if (!assignedVariant) assignedVariant = variantForDevice();
  return assignedVariant;
}

export function forceVariant(variant: Variant): void {
  assignedVariant = variant;
  console.log('[AB] Forced variant:', variant);
}

export function initABTracker(): void {
  console.log('[AB] Tracker ready. Variant:', getOrAssignVariant());
}

function getCurrentSession(): UserSession {
  if (!currentSession) {
    currentSession = {
      variant: getOrAssignVariant(),
      mealsStarted: 0,
      mealsCompleted: 0,
      mealsAbandoned: 0,
      voiceSessions: 0,
      textSessions: 0,
      voiceToggles: 0,
      totalDurationSeconds: 0,
      completedAt: '',
    };
  }
  return currentSession;
}

export function trackABEvent(
  event: string,
  params?: Record<string, unknown>
): void {
  const session = getCurrentSession();

  if (event === 'meal_log_started') {
    session.mealsStarted += 1;
    if (params?.input_method === 'voice') session.voiceSessions += 1;
    else session.textSessions += 1;
  } else if (event === 'meal_log_completed') {
    session.mealsCompleted += 1;
    if (typeof params?.duration_seconds === 'number') {
      session.totalDurationSeconds += params.duration_seconds;
    }
  } else if (event === 'meal_log_abandoned') {
    session.mealsAbandoned += 1;
  } else if (event === 'voice_mode_toggled' && params?.enabled === true) {
    session.voiceToggles += 1;
  }
}

export async function endUserSession(): Promise<void> {
  const session = getCurrentSession();
  session.completedAt = new Date().toISOString();
  completedSessions.push({ ...session });
  currentSession = null;
  console.log('[AB] User session saved. Total sessions:', completedSessions.length);
  printABSummary();
  // Print full raw data so you can copy it from Metro
  console.log('[AB] RAW DATA (copy this):\n' + JSON.stringify(completedSessions, null, 2));
}

export function printABSummary(): void {
  const control = completedSessions.filter((s) => s.variant === 'control');
  const treatment = completedSessions.filter((s) => s.variant === 'treatment');

  const summarize = (group: UserSession[]) => {
    const count = group.length;
    if (count === 0) return { users: 0 };
    return {
      users: count,
      avgMealsCompleted: +(group.reduce((a, s) => a + s.mealsCompleted, 0) / count).toFixed(1),
      avgMealsAbandoned: +(group.reduce((a, s) => a + s.mealsAbandoned, 0) / count).toFixed(1),
      avgTotalDurationSeconds: Math.round(group.reduce((a, s) => a + s.totalDurationSeconds, 0) / count),
      voiceUsers: group.filter((s) => s.voiceSessions > 0).length,
    };
  };

  console.log('\n======= A/B TEST SUMMARY (per user) =======');
  console.log('CONTROL (iPhone 15):', JSON.stringify(summarize(control), null, 2));
  console.log('TREATMENT (iPhone 17):', JSON.stringify(summarize(treatment), null, 2));
  console.log('Total users:', completedSessions.length);
  console.log('============================================\n');
}

export function resetABData(): void {
  completedSessions = [];
  currentSession = null;
  console.log('[AB] All data reset.');
}
