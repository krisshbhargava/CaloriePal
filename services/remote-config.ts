import {
  fetchAndActivate,
  getBoolean,
  getRemoteConfig,
  setConfigSettings,
  setDefaults,
} from '@react-native-firebase/remote-config';

const DEFAULTS = {
  show_enhanced_summary: true,
  show_meal_breakdown: true,
};

export async function configureRemoteConfig(): Promise<void> {
  const rc = getRemoteConfig();
  await setDefaults(rc, DEFAULTS);
  await setConfigSettings(rc, {
    minimumFetchIntervalMillis: __DEV__ ? 0 : 3_600_000,
  });
}

export async function fetchRemoteConfig(): Promise<void> {
  await fetchAndActivate(getRemoteConfig());
}

export function getShowEnhancedSummary(): boolean {
  return getBoolean(getRemoteConfig(), 'show_enhanced_summary');
}

export function getShowMealBreakdown(): boolean {
  return getBoolean(getRemoteConfig(), 'show_meal_breakdown');
}
