import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

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
    sendMessage,
    saveMealFromInterpretation,
    resetChatSession,
  } = useAppStore();

  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const canSubmit = draft.trim().length > 2 && !isInterpreting;
  const isReadyToSave = chatStatus === 'ready_to_confirm' && activeDraft;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [chatMessages, isInterpreting]);

  const onSend = async () => {
    if (!canSubmit) return;
    const text = draft.trim();
    setDraft('');
    await sendMessage(text);
  };

  const onSave = () => {
    const saved = saveMealFromInterpretation(draft);
    if (!saved) {
      Alert.alert('Not ready', 'Please wait for a confirmed estimate before saving.');
      return;
    }
    setDraft('');
    Alert.alert('Saved!', `${saved.title} was added to your log.`);
  };

  const onReset = () => {
    resetChatSession();
    setDraft('');
  };

  return (
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
            <ThemedText type="title" style={styles.emptyTitle}>CaloriePal</ThemedText>
            <ThemedText style={styles.emptyHint}>
              Describe what you ate and I'll estimate the macros. Ask me to clarify anything.
            </ThemedText>
          </View>
        ) : (
          chatMessages.map((msg) => (
            <View
              key={msg.id}
              style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}
            >
              <ThemedText style={msg.role === 'user' ? styles.bubbleTextUser : undefined}>
                {msg.text}
              </ThemedText>
            </View>
          ))
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
              <ThemedText style={styles.saveBtnText}>Save Meal</ThemedText>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={onReset}>
              <ThemedText>Start Over</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      )}

      {chatStatus === 'saved' && (
        <ThemedView style={styles.actionBar}>
          <Pressable style={[styles.actionBtn, styles.saveBtn]} onPress={onReset}>
            <ThemedText style={styles.saveBtnText}>Log Another Meal</ThemedText>
          </Pressable>
        </ThemedView>
      )}

      {/* Input bar */}
      {chatStatus !== 'saved' && (
        <ThemedView style={styles.inputBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="e.g. chicken rice bowl with veggies..."
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
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  emptyTitle: {
    textAlign: 'center',
  },
  emptyHint: {
    textAlign: 'center',
    opacity: 0.6,
    lineHeight: 22,
  },
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
  bubbleTextUser: {
    color: '#fff',
  },
  typingBubble: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  errorBanner: {
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#FFF0F0',
  },
  errorText: {
    color: '#B00020',
    fontSize: 13,
  },
  actionBar: {
    padding: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDD',
  },
  macroRow: {
    gap: 2,
  },
  macroText: {
    opacity: 0.7,
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CCC',
  },
  saveBtn: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
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
  sendBtnDisabled: {
    backgroundColor: '#C0C0C0',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
