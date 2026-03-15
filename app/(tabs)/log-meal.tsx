import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { MealSummaryModal } from '@/components/meal-summary-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppStore } from '@/store/app-store';

export default function LogMealScreen() {
  const {
    chatMessages,
    chatStatus,
    chatError,
    isInterpreting,
    activeDraft,
    pendingInterpretation,
    lastSavedMeal,
    editingMealId,
    sendMessage,
    saveMealFromInterpretation,
    clearLastSavedMeal,
    resetChatSession,
  } = useAppStore();

  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const canSubmit = draft.trim().length > 0 && !isInterpreting;
  const isReadyToSave = chatStatus === 'ready_to_confirm' && activeDraft;
  const clarificationOptions =
    chatStatus === 'awaiting_clarification'
      ? (pendingInterpretation?.clarificationOptions ?? [])
      : [];

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [chatMessages, isInterpreting]);

  const onSend = async () => {
    if (!canSubmit) return;
    const text = draft.trim();
    setDraft('');
    await sendMessage(text);
  };

  const onSelectOption = async (option: string) => {
    await sendMessage(option);
  };

  const onSave = () => {
    saveMealFromInterpretation(draft);
    setDraft('');
  };

  const onReset = () => {
    resetChatSession();
    setDraft('');
  };

  return (
    <>
      <MealSummaryModal meal={lastSavedMeal} onDone={clearLastSavedMeal} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {/* Chat history */}
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
        >
          {chatMessages.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText type="title" style={styles.emptyTitle}>
                {editingMealId ? 'Edit Meal' : 'CaloriePal'}
              </ThemedText>
              <ThemedText style={styles.emptyHint}>
                Tell me what you ate and I'll ask a few quick questions to nail the calories.
              </ThemedText>
            </View>
          ) : (
            chatMessages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.bubble,
                  msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                ]}
              >
                <ThemedText style={msg.role === 'user' ? styles.bubbleTextUser : undefined}>
                  {msg.text}
                </ThemedText>
              </View>
            ))
          )}

          {/* Option chips inline after last assistant message */}
          {clarificationOptions.length > 0 && !isInterpreting && (
            <View style={styles.chipsContainer}>
              {clarificationOptions.map((option) => (
                <Pressable
                  key={option}
                  style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                  onPress={() => onSelectOption(option)}
                >
                  <ThemedText style={styles.chipText}>{option}</ThemedText>
                </Pressable>
              ))}
            </View>
          )}

          {isInterpreting && (
            <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
              <ActivityIndicator size="small" />
            </View>
          )}

          {!!chatError && (
            <ThemedView style={styles.errorBanner}>
              <ThemedText style={styles.errorText}>{chatError}</ThemedText>
            </ThemedView>
          )}
        </ScrollView>

        {/* Save / Reset actions when estimate is ready */}
        {isReadyToSave && (
          <ThemedView style={styles.actionBar}>
            <View style={styles.macroRow}>
              <ThemedText type="defaultSemiBold">{activeDraft.mealTitle}</ThemedText>
              <ThemedText style={styles.macroText}>
                {activeDraft.estimatedMacros.calories} kcal · {activeDraft.estimatedMacros.protein}g P ·{' '}
                {activeDraft.estimatedMacros.carbs}g C · {activeDraft.estimatedMacros.fat}g F
              </ThemedText>
            </View>
            <View style={styles.actionButtons}>
              <Pressable style={[styles.actionBtn, styles.saveBtn]} onPress={onSave}>
                <ThemedText style={styles.saveBtnText}>
                  {editingMealId ? 'Save Changes' : 'Save Meal'}
                </ThemedText>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={onReset}>
                <ThemedText>Start Over</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        )}

        {/* Input bar */}
        <ThemedView style={styles.inputBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={
              chatStatus === 'awaiting_clarification'
                ? 'Or type your own answer...'
                : 'e.g. chicken nuggets with sauce...'
            }
            placeholderTextColor="#999"
            style={styles.input}
            multiline
            returnKeyType="send"
            onSubmitEditing={onSend}
            editable={!isInterpreting}
          />
          <Pressable
            style={[styles.sendBtn, !canSubmit && styles.sendBtnDisabled]}
            onPress={onSend}
            disabled={!canSubmit}
          >
            <ThemedText style={styles.sendBtnText}>↑</ThemedText>
          </Pressable>
        </ThemedView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  messageList: {
    padding: 16,
    gap: 10,
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyTitle: { textAlign: 'center' },
  emptyHint: { textAlign: 'center', opacity: 0.6, lineHeight: 22 },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 4,
  },
  bubbleTextUser: { color: '#fff' },
  typingBubble: { paddingVertical: 14, paddingHorizontal: 18 },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingLeft: 4,
    paddingTop: 2,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    backgroundColor: '#F0F6FF',
  },
  chipPressed: { backgroundColor: '#007AFF' },
  chipText: { color: '#007AFF', fontSize: 14, fontWeight: '500' },
  errorBanner: { borderRadius: 10, padding: 12, backgroundColor: '#FFF0F0' },
  errorText: { color: '#B00020', fontSize: 13 },
  actionBar: {
    padding: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDD',
  },
  macroRow: { gap: 2 },
  macroText: { opacity: 0.7, fontSize: 13 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CCC',
  },
  saveBtn: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDD',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#C0C0C0' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
