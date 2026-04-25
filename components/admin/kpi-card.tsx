import { StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
};

export function KpiCard({ label, value, sub, accent = '#6366F1' }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
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
    borderRadius: 16,
    padding: 20,
    gap: 4,
    borderWidth: 1,
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
