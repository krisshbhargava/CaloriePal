import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MealEntry } from '@/models/domain';

type Props = {
  meal: MealEntry | null;
  onClose: () => void;
  onSaveManual: (id: string, updates: { calories: number; protein: number; carbs: number; fat: number }) => void;
  onEditWithAI: (meal: MealEntry) => void;
};

export function EditMealModal({ meal, onClose, onSaveManual, onEditWithAI }: Props) {
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  // Reset fields whenever a new meal opens
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
        <ThemedView style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.editingLabel}>Editing</ThemedText>
              <ThemedText type="subtitle">{meal.title}</ThemedText>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <ThemedText style={styles.closeBtnText}>✕</ThemedText>
            </Pressable>
          </View>

          {/* AI Edit option */}
          <Pressable style={styles.aiBtn} onPress={handleEditWithAI}>
            <ThemedText style={styles.aiBtnText}>✦  Edit with AI</ThemedText>
            <ThemedText style={styles.aiBtnSub}>Describe what changed — AI will recalculate</ThemedText>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <ThemedText style={styles.dividerLabel}>or edit manually</ThemedText>
            <View style={styles.dividerLine} />
          </View>

          {/* Manual fields */}
          <View style={styles.fields}>
            <MacroField label="Calories (kcal)" value={calories} onChange={setCalories} />
            <View style={styles.fieldRow}>
              <MacroField label="Protein (g)" value={protein} onChange={setProtein} flex />
              <MacroField label="Carbs (g)" value={carbs} onChange={setCarbs} flex />
              <MacroField label="Fat (g)" value={fat} onChange={setFat} flex />
            </View>
          </View>

          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <ThemedText style={styles.saveBtnText}>Save Changes</ThemedText>
          </Pressable>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  flex?: boolean;
}) {
  return (
    <View style={[styles.fieldWrapper, flex && styles.fieldFlex]}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        style={styles.fieldInput}
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    opacity: 0.4,
  },
  aiBtn: {
    backgroundColor: '#F0F6FF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    padding: 14,
    gap: 4,
  },
  aiBtnText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 15,
  },
  aiBtnSub: {
    color: '#007AFF',
    opacity: 0.7,
    fontSize: 13,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#CCC',
  },
  dividerLabel: {
    fontSize: 12,
    opacity: 0.5,
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
    fontWeight: '500',
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
