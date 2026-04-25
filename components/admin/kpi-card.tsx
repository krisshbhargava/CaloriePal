import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
};

export function KpiCard({ label, value, sub, accent = '#6366F1' }: Props) {
  return (
    <View style={styles.card}>
      <ThemedText style={[styles.value, { color: accent }]}>{value}</ThemedText>
      <ThemedText style={styles.label}>{label}</ThemedText>
      {sub ? <ThemedText style={styles.sub}>{sub}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#161628',
    borderRadius: 16,
    padding: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: '#2D2D45',
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sub: {
    fontSize: 12,
    opacity: 0.45,
    marginTop: 2,
  },
});
