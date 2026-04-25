import type { DailyAnalytics, UserAnalytics } from '@/models/analytics';

// Non-web stub — the admin dashboard is only meaningful on web.
export function ActivityCharts(_props: { daily: DailyAnalytics[]; users: UserAnalytics[] }) {
  return null;
}
