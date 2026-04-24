import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { RaisedPressable } from '@/components/raised-pressable';

import { MealBreakdownList } from '@/components/meal-breakdown-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts, Shadows } from '@/constants/theme';
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
        <ThemedView style={[styles.card, Shadows.modal]}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.checkRow}>
              <View style={[styles.checkCircle, { backgroundColor: theme.success }]}>
                <ThemedText style={styles.checkIcon}>✓</ThemedText>
              </View>
              <ThemedText type="defaultSemiBold" style={[styles.savedLabel, { color: theme.success }]}>Meal Saved</ThemedText>
            </View>

            <ThemedText type="title" style={styles.mealTitle}>{meal.title}</ThemedText>

            <View style={styles.calorieBlock}>
              <ThemedText style={styles.calorieNumber}>{meal.calories}</ThemedText>
              <ThemedText style={styles.calorieUnit}>kcal</ThemedText>
            </View>

            <View style={styles.macroRow}>
              <MacroPill label="Protein" value={meal.protein} theme={theme} color={Colors.macro.protein} />
              <MacroPill label="Carbs" value={meal.carbs} theme={theme} color={Colors.macro.carbs} />
              <MacroPill label="Fat" value={meal.fat} theme={theme} color={Colors.macro.fat} />
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

            <RaisedPressable style={[styles.doneBtn, { backgroundColor: theme.primary }]} onPress={onDone}>
              <ThemedText style={styles.doneBtnText}>Done</ThemedText>
            </RaisedPressable>
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
  color,
}: {
  label: string;
  value: number;
  theme: (typeof Colors)['light'];
  color: string;
}) {
  return (
    <ThemedView
      lightColor={theme.surface}
      darkColor={theme.surface}
      style={[styles.pill, { borderLeftColor: color, borderLeftWidth: 4, borderColor: theme.cardBorder }]}>
      <ThemedText style={styles.pillValue}>{value}g</ThemedText>
      <ThemedText style={[styles.pillLabel, { color: theme.textMuted }]}>{label}</ThemedText>
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
    borderRadius: 28,
    padding: 24,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: '#fff',
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
  savedLabel: {
    fontFamily: Fonts.bold,
  },
  mealTitle: {
    textAlign: 'center',
  },
  calorieBlock: {
    alignItems: 'center',
    gap: 2,
  },
  calorieNumber: {
    fontSize: 60,
    fontFamily: Fonts.extraBold,
    lineHeight: 66,
  },
  calorieUnit: {
    fontSize: 16,
    opacity: 0.5,
    fontFamily: Fonts.regular,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  pill: {
    flex: 1,
    borderRadius: 20,
    padding: 12,
    gap: 2,
    borderWidth: 1,
  },
  pillValue: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  pillLabel: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  assumptions: {
    width: '100%',
    gap: 4,
  },
  assumptionsLabel: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  assumption: {
    fontSize: 13,
    opacity: 0.7,
    fontFamily: Fonts.regular,
  },
  doneBtn: {
    width: '100%',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  doneBtnText: {
    color: '#fff',
    fontFamily: Fonts.bold,
    fontSize: 17,
  },
});
