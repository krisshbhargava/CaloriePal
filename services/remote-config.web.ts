import { fetchAndActivate, getBoolean, getRemoteConfig, isSupported } from 'firebase/remote-config';

import { app } from './firebase';

const DEFAULTS = {
  show_enhanced_summary: true,
  show_meal_breakdown: true,
};

let rcInstance: ReturnType<typeof getRemoteConfig> | null = null;

function getRC() {
  if (!rcInstance) rcInstance = getRemoteConfig(app);
  return rcInstance;
}

export async function configureRemoteConfig(): Promise<void> {
  if (!(await isSupported())) return;
  const rc = getRC();
  rc.defaultConfig = DEFAULTS;
  rc.settings.minimumFetchIntervalMillis = __DEV__ ? 0 : 3_600_000;
}

export async function fetchRemoteConfig(): Promise<void> {
  if (!(await isSupported())) return;
  await fetchAndActivate(getRC());
}

export function getShowEnhancedSummary(): boolean {
  try {
    return rcInstance ? getBoolean(getRC(), 'show_enhanced_summary') : DEFAULTS.show_enhanced_summary;
  } catch {
    return DEFAULTS.show_enhanced_summary;
  }
}

export function getShowMealBreakdown(): boolean {
  try {
    return rcInstance ? getBoolean(getRC(), 'show_meal_breakdown') : DEFAULTS.show_meal_breakdown;
  } catch {
    return DEFAULTS.show_meal_breakdown;
  }
}
