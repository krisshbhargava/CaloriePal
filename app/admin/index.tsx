import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityCharts } from '@/components/admin/charts';
import { KpiCard } from '@/components/admin/kpi-card';
import { ThemedText } from '@/components/themed-text';
import { fetchDailyAnalytics, fetchAllUserAnalytics, fetchMealHistory } from '@/services/firestore';
import { useAppStore } from '@/store/app-store';
import type { DailyAnalytics, UserAnalytics } from '@/models/analytics';

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function SkeletonBlock({ width, height }: { width: number | string; height: number }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);
  return <Animated.View style={[{ width, height, borderRadius: 12, backgroundColor: '#D1D5DB' }, { opacity }]} />;
}

function DashboardSkeleton() {
  return (
    <>
      <View style={styles.kpiRow}>
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <SkeletonBlock width={60} height={36} />
            <SkeletonBlock width={90} height={12} />
            <SkeletonBlock width={70} height={10} />
          </View>
        ))}
      </View>
      <View style={styles.skeletonChartRow}>
        <View style={styles.skeletonChart}><SkeletonBlock width="100%" height={250} /></View>
        <View style={styles.skeletonChart}><SkeletonBlock width="100%" height={250} /></View>
      </View>
    </>
  );
}

export default function AdminDashboard() {
  const { isAdmin } = useAppStore();
  const insets = useSafeAreaInsets();
  const [refreshKey, setRefreshKey] = useState(0);

  const [daily, setDaily] = useState<DailyAnalytics[]>([]);
  const [users, setUsers] = useState<UserAnalytics[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    Promise.all([fetchDailyAnalytics(30), fetchMealHistory(30), fetchAllUserAnalytics()])
      .then(([analytics, mealHistory, userStats]) => {
        // Merge historical meal data into analytics rows
        const merged = analytics.map((d) => {
          const hist = mealHistory.get(d.date);
          return {
            ...d,
            mealsLogged: hist ? hist.meals : d.mealsLogged,
            totalCalories: hist ? hist.calories : d.totalCalories,
            activeUsers: hist ? [...hist.uids] : d.activeUsers,
          };
        });
        setDaily(merged);
        setUsers(userStats);

        // Total users = max of analytics_users count vs unique UIDs in meal history
        const allUids = new Set([...mealHistory.values()].flatMap((v) => [...v.uids]));
        setTotalUsers(Math.max(userStats.length, allUids.size));
      })
      .catch((e) => setError(e?.message ?? 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) { router.replace('/(tabs)'); return; }
    loadData();
  }, [isAdmin, loadData, refreshKey]);

  // ── Derived KPIs ──────────────────────────────────────────────────────────
  const today = daily[daily.length - 1];
  const dauToday = today?.activeUsers.length ?? 0;
  const mealsToday = today?.mealsLogged ?? 0;

  const completedTotal = daily.reduce((s, d) => s + d.sessionsCompleted, 0);
  const startedTotal = daily.reduce((s, d) => s + d.sessionsStarted, 0);
  const aiSuccessRate = startedTotal > 0 ? Math.round((completedTotal / startedTotal) * 100) : 0;

  const totalMeals30 = daily.reduce((s, d) => s + d.mealsLogged, 0);
  const activeDays = daily.filter((d) => d.mealsLogged > 0).length;
  const avgMealsDay = activeDays > 0 ? (totalMeals30 / activeDays).toFixed(1) : '—';

  const totalDuration = daily.reduce((s, d) => s + d.totalSessionDuration, 0);
  const avgDuration = completedTotal > 0 ? formatDuration(Math.round(totalDuration / completedTotal)) : '—';

  const retainedUsers = users.filter((u) => (u.activeDates?.length ?? 0) >= 2).length;
  const retentionRate = totalUsers > 0 ? Math.round((retainedUsers / totalUsers) * 100) : 0;

  if (!isAdmin) return null;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
      indicatorStyle="white"
    >
      <View style={styles.maxWidth}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.replace('/(tabs)')} style={styles.backBtn} hitSlop={8}>
            <ThemedText style={styles.backText}>← Back</ThemedText>
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText style={styles.title}>Operations Dashboard</ThemedText>
            <ThemedText style={styles.subtitle}>Last 30 days · live Firestore</ThemedText>
          </View>
          <Pressable
            onPress={() => setRefreshKey((k) => k + 1)}
            style={[styles.backBtn, loading && styles.btnDisabled]}
            hitSlop={8}
            disabled={loading}
          >
            <ThemedText style={styles.backText}>↺ Refresh</ThemedText>
          </Pressable>
        </View>

        {error ? (
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        ) : loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* KPI row */}
            <View style={styles.kpiRow}>
              <KpiCard label="Total Users" value={totalUsers} sub="ever logged a meal" />
              <KpiCard label="DAU Today" value={dauToday} sub="unique active" accent="#10B981" />
              <KpiCard label="Meals Today" value={mealsToday} sub="logged" accent="#818CF8" />
              <KpiCard label="AI Success" value={aiSuccessRate > 0 ? `${aiSuccessRate}%` : '—'} sub="30-day completion" accent="#F59E0B" />
              <KpiCard label="Avg Meals/Day" value={avgMealsDay} sub="on active days" accent="#6366F1" />
              <KpiCard label="Avg Session" value={avgDuration} sub="to log a meal" accent="#10B981" />
              <KpiCard label="Retention" value={retentionRate > 0 ? `${retentionRate}%` : '—'} sub="users on 2+ days" accent="#F43F5E" />
            </View>

            {/* Charts */}
            <ActivityCharts daily={daily} users={users} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F3FB' },
  maxWidth: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 20,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 12, opacity: 0.4, marginTop: 2 },
  backBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  btnDisabled: { opacity: 0.4 },
  backText: { fontSize: 13, fontWeight: '600' },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  errorText: { color: '#EF4444', marginTop: 24 },
  skeletonCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  skeletonChartRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  skeletonChart: { flex: 1, minWidth: 280, borderRadius: 16, overflow: 'hidden' },
});
