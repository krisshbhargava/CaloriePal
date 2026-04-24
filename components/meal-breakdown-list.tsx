import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MealComponent } from '@/models/domain';

type Props = {
  components: MealComponent[];
  compact?: boolean;
};

export function MealBreakdownList({ components, compact = false }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  if (components.length === 0) return null;

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.label, { color: theme.tabIconDefault }]}>Breakdown</ThemedText>
      {components.map((component, index) => (
        <ThemedView
          key={`${component.quantity}-${component.name}-${index}`}
          lightColor={theme.surface}
          darkColor={theme.surface}
          style={[
            styles.item,
            compact && styles.itemCompact,
            { borderColor: theme.cardBorder },
          ]}>
          <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
            {formatComponentLabel(component)}
          </ThemedText>
          <ThemedText style={styles.itemMacros}>
            {component.calories} kcal | P {component.protein}g | C {component.carbs}g | F {component.fat}g
          </ThemedText>
        </ThemedView>
      ))}
    </View>
  );
}

function formatComponentLabel(component: MealComponent) {
  return component.quantity.trim() ? `${component.quantity} ${component.name}` : component.name;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  item: {
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  itemCompact: {
    paddingVertical: 10,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemMacros: {
    fontSize: 12,
    opacity: 0.9,
    lineHeight: 18,
    fontWeight: '400',
  },
});
