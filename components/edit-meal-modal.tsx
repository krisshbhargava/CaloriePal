import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { RaisedPressable } from '@/components/raised-pressable';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MealEntry } from '@/models/domain';

type Props = {
  meal: MealEntry | null;
  onClose: () => void;
  onSaveManual: (id: string, updates: { calories: number; protein: number; carbs: number; fat: number }) => void;
  onEditWithAI: (meal: MealEntry) => void;
};

export function EditMealModal({ meal, onClose, onSaveManual, onEditWithAI }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const handleOpen = () => {
    if (meal) {
      setCalories(String(meal.calories));
      setProtein(String(meal.protein));
      setCarbs(String(meal.carbs));
      setFat(String(meal.fat));
    }
  };

  const handleSave = () => {
    if (!meal) return;
    onSaveManual(meal.id, {
      calories: Number(calories) || meal.calories,
      protein: Number(protein) || meal.protein,
      carbs: Number(carbs) || meal.carbs,
      fat: Number(fat) || meal.fat,
    });
    onClose();
  };

  const handleEditWithAI = () => {
    if (!meal) return;
    onClose();
    onEditWithAI(meal);
  };

  if (!meal) return null;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <View style={styles.overlay}>
        <ThemedView style={[styles.sheet, Shadows.modal]}>
          <View style={styles.header}>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.editingLabel}>Editing</ThemedText>
              <ThemedText type="subtitle">{meal.title}</ThemedText>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <ThemedText style={styles.closeBtnText}>✕</ThemedText>
            </Pressable>
          </View>

          <RaisedPressable style={[styles.aiBtn, { backgroundColor: theme.primaryMuted, borderColor: theme.primary }]} onPress={handleEditWithAI} shadowColor={theme.primary}>
            <ThemedText style={[styles.aiBtnText, { color: theme.primary }]}>✦  Edit with AI</ThemedText>
            <ThemedText style={[styles.aiBtnSub, { color: theme.primary }]}>Describe what changed — AI will recalculate</ThemedText>
          </RaisedPressable>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
            <ThemedText style={styles.dividerLabel}>or edit manually</ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
          </View>

          <View style={styles.fields}>
            <MacroField label="Calories (kcal)" value={calories} onChange={setCalories} theme={theme} />
            <View style={styles.fieldRow}>
              <MacroField label="Protein (g)" value={protein} onChange={setProtein} flex theme={theme} />
              <MacroField label="Carbs (g)" value={carbs} onChange={setCarbs} flex theme={theme} />
              <MacroField label="Fat (g)" value={fat} onChange={setFat} flex theme={theme} />
            </View>
          </View>

          <RaisedPressable style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSave}>
            <ThemedText style={styles.saveBtnText}>Save Changes</ThemedText>
          </RaisedPressable>
        </ThemedView>
      </View>
    </Modal>
  );
}

function MacroField({
  label,
  value,
  onChange,
  flex,
  theme,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  flex?: boolean;
  theme: typeof Colors['light'];
}) {
  return (
    <View style={[styles.fieldWrapper, flex && styles.fieldFlex]}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        style={[styles.fieldInput, { borderColor: theme.cardBorder, color: theme.text, backgroundColor: theme.surface }]}
        selectTextOnFocus
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  editingLabel: {
    fontSize: 12,
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    opacity: 0.6,
    fontWeight: '700' as const,
  },
  aiBtn: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 4,
  },
  aiBtnText: {
    fontWeight: '700' as const,
    fontSize: 15,
  },
  aiBtnSub: {
    opacity: 0.7,
    fontSize: 13,
    fontWeight: '400' as const,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerLabel: {
    fontSize: 12,
    opacity: 0.5,
    fontWeight: '400' as const,
  },
  fields: {
    gap: 10,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldWrapper: {
    gap: 4,
  },
  fieldFlex: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    opacity: 0.5,
    fontWeight: '400' as const,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  saveBtn: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700' as const,
    fontSize: 17,
  },
});
