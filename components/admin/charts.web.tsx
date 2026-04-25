import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import type { DailyAnalytics, UserAnalytics } from '@/models/analytics';

const C = {
  primary: '#6366F1',
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  indigo2: '#818CF8',
};

const CHART_H = 250;

function SectionTitle({ children }: { children: string }) {
  return <ThemedText style={styles.sectionTitle}>{children}</ThemedText>;
}

function ChartCard({ title, children, bg, border }: { title: string; children: React.ReactNode; bg: string; border: string }) {
  return (
    <View style={[styles.chartCard, { backgroundColor: bg, borderColor: border }]}>
      <ThemedText style={styles.chartTitle}>{title}</ThemedText>
      {children}
    </View>
  );
}

function EmptyChart({ surface }: { surface: string }) {
  return (
    <View style={[styles.empty, { backgroundColor: surface }]}>
      <ThemedText style={styles.emptyText}>No data yet</ThemedText>
      <ThemedText style={styles.emptyHint}>Starts populating when users log meals</ThemedText>
    </View>
  );
}

function shortDate(iso: string) {
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}`;
}

function allZero(data: Record<string, unknown>[], key: string): boolean {
  return data.every((d) => (d[key] as number) === 0);
}

type Props = { daily: DailyAnalytics[]; users: UserAnalytics[] };

export function ActivityCharts({ daily, users }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const gridColor = isDark ? '#2D2D4A' : '#f0f0f0';
  const axisColor = isDark ? '#9CA3AF' : '#6B7280';
  const xAxisProps = {
    tick: { fontSize: 10, fill: axisColor },
    angle: -35,
    textAnchor: 'end' as const,
    height: 48,
  };
  const yAxisProps = { tick: { fontSize: 11, fill: axisColor }, width: 30 };
  const dauData = daily.map((d) => ({ date: shortDate(d.date), dau: d.activeUsers.length }));
  const mealsData = daily.map((d) => ({ date: shortDate(d.date), meals: d.mealsLogged }));
  const funnelData = daily.map((d) => ({
    date: shortDate(d.date),
    Completed: d.sessionsCompleted,
    Abandoned: d.sessionsAbandoned,
    'In Progress': Math.max(0, d.sessionsStarted - d.sessionsCompleted - d.sessionsAbandoned),
  }));
  const calData = daily.map((d) => ({
    date: shortDate(d.date),
    avg: d.mealsLogged > 0 ? Math.round(d.totalCalories / d.mealsLogged) : 0,
  }));
  const clarData = daily.map((d) => ({
    date: shortDate(d.date),
    rate: d.sessionsStarted > 0
      ? Math.round((d.clarificationsTotal / d.sessionsStarted) * 10) / 10
      : 0,
  }));

  const totalVoice = daily.reduce((s, d) => s + d.voiceModeSessions, 0);
  const totalStarted = daily.reduce((s, d) => s + d.sessionsStarted, 0);
  const inputPie = [
    { name: 'Text', value: Math.max(0, totalStarted - totalVoice) },
    { name: 'Voice', value: totalVoice },
  ];
  const inputPieHasData = inputPie.some((p) => p.value > 0);

  const recentUsers = [...users]
    .sort((a, b) => (b.lastActive > a.lastActive ? 1 : -1))
    .slice(0, 10);

  return (
    <View style={styles.root}>
      {/* ── Engagement ── */}
      <SectionTitle>Engagement</SectionTitle>
      <View style={styles.row}>
        <ChartCard title="Daily Active Users" bg={theme.card} border={theme.cardBorder}>
          {allZero(dauData, 'dau') ? <EmptyChart surface={theme.surface} /> : (
            <ResponsiveContainer width="100%" height={CHART_H}>
              <LineChart data={dauData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" {...xAxisProps} />
                <YAxis {...yAxisProps} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [`${v} users`, 'DAU']} />
                <Line type="monotone" dataKey="dau" stroke={C.primary} strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Meals Logged Per Day" bg={theme.card} border={theme.cardBorder}>
          {allZero(mealsData, 'meals') ? <EmptyChart surface={theme.surface} /> : (
            <ResponsiveContainer width="100%" height={CHART_H}>
              <BarChart data={mealsData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" {...xAxisProps} />
                <YAxis {...yAxisProps} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [`${v} meals`, 'Logged']} />
                <Bar dataKey="meals" fill={C.indigo2} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </View>

      {/* ── AI Session Funnel ── */}
      <SectionTitle>AI Session Funnel</SectionTitle>
      <View style={styles.row}>
        <ChartCard title="Session Outcomes (last 30 days)" bg={theme.card} border={theme.cardBorder}>
          {allZero(funnelData, 'Completed') && allZero(funnelData, 'Abandoned') ? <EmptyChart surface={theme.surface} /> : (
            <ResponsiveContainer width="100%" height={CHART_H}>
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" {...xAxisProps} />
                <YAxis {...yAxisProps} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12, color: axisColor }} />
                <Bar dataKey="Completed" stackId="a" fill={C.green} />
                <Bar dataKey="In Progress" stackId="a" fill={C.amber} />
                <Bar dataKey="Abandoned" stackId="a" fill={C.red} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Avg Clarifications Per Session" bg={theme.card} border={theme.cardBorder}>
          {allZero(clarData, 'rate') ? <EmptyChart surface={theme.surface} /> : (
            <ResponsiveContainer width="100%" height={CHART_H}>
              <LineChart data={clarData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" {...xAxisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip formatter={(v: number) => [`${v}`, 'Clarifications / session']} />
                <Line type="monotone" dataKey="rate" stroke={C.amber} strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </View>

      {/* ── Nutrition & Input ── */}
      <SectionTitle>Nutrition & Input</SectionTitle>
      <View style={styles.row}>
        <ChartCard title="Avg Calories Per Meal" bg={theme.card} border={theme.cardBorder}>
          {allZero(calData, 'avg') ? <EmptyChart surface={theme.surface} /> : (
            <ResponsiveContainer width="100%" height={CHART_H}>
              <LineChart data={calData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" {...xAxisProps} />
                <YAxis {...yAxisProps} width={40} />
                <Tooltip formatter={(v: number) => [`${v} kcal`, 'Avg per meal']} />
                <Line type="monotone" dataKey="avg" stroke={C.green} strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Input Method (30-day)" bg={theme.card} border={theme.cardBorder}>
          {!inputPieHasData ? <EmptyChart surface={theme.surface} /> : (
            <ResponsiveContainer width="100%" height={CHART_H}>
              <PieChart>
                <Pie
                  data={inputPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                  labelLine={false}
                >
                  <Cell fill={C.primary} />
                  <Cell fill={C.amber} />
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} sessions`]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </View>

      {/* ── Recent Users ── */}
      <SectionTitle>Recent Users</SectionTitle>
      <View style={[styles.table, { backgroundColor: theme.card }]}>
        <View style={[styles.tableRow, styles.tableHeader, { backgroundColor: theme.surface, borderBottomColor: theme.cardBorder }]}>
          {['User', 'Last Active', 'Total Meals', 'Sessions', 'Completed', 'Active Days'].map((h) => (
            <ThemedText key={h} style={styles.tableHead}>{h}</ThemedText>
          ))}
        </View>
        {recentUsers.length === 0 ? (
          <ThemedText style={styles.tableEmpty}>No user data yet — starts recording on next session</ThemedText>
        ) : recentUsers.map((u) => (
          <View key={u.uid} style={[styles.tableRow, { borderBottomColor: theme.cardBorder }]}>
            <ThemedText style={styles.tableCell} numberOfLines={1}>
              {u.email ?? `${u.uid.slice(0, 10)}…`}
            </ThemedText>
            <ThemedText style={styles.tableCell}>{u.lastActive.slice(0, 10)}</ThemedText>
            <ThemedText style={styles.tableCell}>{u.totalMeals ?? 0}</ThemedText>
            <ThemedText style={styles.tableCell}>{u.totalSessions ?? 0}</ThemedText>
            <ThemedText style={styles.tableCell}>{u.totalSessionsCompleted ?? 0}</ThemedText>
            <ThemedText style={styles.tableCell}>{u.activeDates?.length ?? 0}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.4,
    marginTop: 4,
  },
  row: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  chartCard: {
    flex: 1,
    minWidth: 300,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  chartTitle: { fontSize: 14, fontWeight: '600', marginBottom: 16 },
  empty: {
    height: CHART_H,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
  },
  emptyText: { fontSize: 14, fontWeight: '600', opacity: 0.35 },
  emptyHint: { fontSize: 12, opacity: 0.3 },
  table: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableHeader: {},
  tableHead: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    opacity: 0.45,
  },
  tableCell: { flex: 1, fontSize: 13 },
  tableEmpty: { padding: 20, opacity: 0.4, textAlign: 'center', fontSize: 13 },
});
