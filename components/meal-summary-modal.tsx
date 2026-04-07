import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MealBreakdownList } from '@/components/meal-breakdown-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MealEntry } from '@/models/domain';

type Props = {
  meal: MealEntry | null;
  onDone: () => void;
  enabled?: boolean;
};

export function MealSummaryModal({ meal, onDone, enabled = true }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  if (!meal || !enabled) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.overlay}>
        <ThemedView style={styles.card}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.checkRow}>
              <View style={styles.checkCircle}>
                <ThemedText style={styles.checkIcon}>?</ThemedText>
              </View>
              <ThemedText type="defaultSemiBold" style={styles.savedLabel}>Meal Saved</ThemedText>
            </View>

            <ThemedText type="title" style={styles.mealTitle}>{meal.title}</ThemedText>

            <View style={styles.calorieBlock}>
              <ThemedText style={styles.calorieNumber}>{meal.calories}</ThemedText>
              <ThemedText style={styles.calorieUnit}>kcal</ThemedText>
            </View>

            <View style={styles.macroRow}>
              <MacroPill label="Protein" value={meal.protein} theme={theme} />
              <MacroPill label="Carbs" value={meal.carbs} theme={theme} />
              <MacroPill label="Fat" value={meal.fat} theme={theme} />
            </View>

            <MealBreakdownList components={meal.components} />

            {meal.assumptions.length > 0 && (
              <View style={styles.assumptions}>
                <ThemedText style={styles.assumptionsLabel}>Assumptions</ThemedText>
                {meal.assumptions.map((a, i) => (
                  <ThemedText key={i} style={styles.assumption}>- {a}</ThemedText>
                ))}
              </View>
            )}

            <Pressable style={styles.doneBtn} onPress={onDone}>
              <ThemedText style={styles.doneBtnText}>Done</ThemedText>
            </Pressable>
          </ScrollView>
        </ThemedView>
      </View>
    </Modal>
  );
}

function MacroPill({
  label,
  value,
  theme,
}: {
  label: string;
  value: number;
  theme: (typeof Colors)['light'];
}) {
  return (
    <ThemedView
      lightColor={theme.surface}
      darkColor={theme.surface}
      style={[styles.pill, { borderColor: theme.cardBorder }]}>
      <ThemedText style={styles.pillValue}>{value}g</ThemedText>
      <ThemedText style={[styles.pillLabel, { color: theme.tabIconDefault }]}>{label}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    borderRadius: 24,
    padding: 20,
  },
  scroll: {
    width: '100%',
  },
  scrollContent: {
    gap: 16,
    alignItems: 'center',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  savedLabel: {
    color: '#34C759',
  },
  mealTitle: {
    textAlign: 'center',
  },
  calorieBlock: {
    alignItems: 'center',
    gap: 2,
  },
  calorieNumber: {
    fontSize: 56,
    fontWeight: '700',
    lineHeight: 60,
  },
  calorieUnit: {
    fontSize: 16,
    opacity: 0.5,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  pill: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
  },
  pillValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  pillLabel: {
    fontSize: 12,
  },
  assumptions: {
    width: '100%',
    gap: 4,
  },
  assumptionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  assumption: {
    fontSize: 13,
    opacity: 0.7,
  },
  doneBtn: {
    width: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  doneBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
