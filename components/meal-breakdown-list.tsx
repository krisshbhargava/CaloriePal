import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MealComponent } from '@/models/domain';

type Props = {
  components: MealComponent[];
  compact?: boolean;
};

export function MealBreakdownList({ components, compact = false }: Props) {
  if (components.length === 0) return null;

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>Breakdown</ThemedText>
      {components.map((component, index) => (
        <ThemedView
          key={`${component.quantity}-${component.name}-${index}`}
          style={[styles.item, compact && styles.itemCompact]}>
          <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
            {formatComponentLabel(component)}
          </ThemedText>
          <ThemedText style={styles.itemMacros}>
            {component.calories} kcal · P {component.protein}g · C {component.carbs}g · F {component.fat}g
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
    fontWeight: '600',
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  item: {
    borderRadius: 12,
    padding: 10,
    gap: 4,
    backgroundColor: '#F5F5F5',
  },
  itemCompact: {
    paddingVertical: 8,
  },
  itemTitle: {
    fontSize: 13,
  },
  itemMacros: {
    fontSize: 12,
    opacity: 0.7,
    lineHeight: 18,
  },
});
