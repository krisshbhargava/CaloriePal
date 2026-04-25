export type DailyAnalytics = {
  date: string;
  mealsLogged: number;
  sessionsStarted: number;
  sessionsCompleted: number;
  sessionsAbandoned: number;
  clarificationsTotal: number;
  voiceModeSessions: number;
  voiceToggles: number;
  premiumUpsellClicks: number;
  totalCalories: number;
  totalSessionDuration: number;
  activeUsers: string[];
};

export type UserAnalytics = {
  uid: string;
  email?: string;
  lastActive: string;
  totalMeals: number;
  totalSessions: number;
  totalSessionsCompleted: number;
  activeDates: string[];
  premiumUpsellClicks?: number;
};
