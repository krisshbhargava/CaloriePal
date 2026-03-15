import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppStore } from '@/store/app-store';

export default function LogMealScreen() {
  const {
    chatMessages,
    chatStatus,
    chatError,
    pendingInterpretation,
    requestMealInterpretation,
    chooseClarificationOption,
    saveMealFromInterpretation,
    resetChatSession,
  } = useAppStore();
  const [draft, setDraft] = useState('');

  const canSubmit = draft.trim().length > 3;

  const recentMessages = useMemo(() => chatMessages.slice(-4), [chatMessages]);

  const onInterpret = () => {
    if (!canSubmit) {
      return;
    }

    requestMealInterpretation(draft);
  };

  const onSave = () => {
    const saved = saveMealFromInterpretation({ description: draft });
    if (!saved) {
      Alert.alert('Meal not ready', 'Please wait for a ready estimate before saving.');
      return;
    }

    Alert.alert('Saved', `${saved.title} was added to your meals.`);
    setDraft('');
  };

  const onChooseClarification = (option: string) => {
    chooseClarificationOption(option);
  };

  const onResetSession = () => {
    resetChatSession();
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.section}>
        <ThemedText type="title">Log New Meal</ThemedText>
        <ThemedText>Describe your meal in your own words.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="defaultSemiBold">What did you eat?</ThemedText>
        <ThemedText>Chat status: {chatStatus.replaceAll('_', ' ')}</ThemedText>
        {!!chatError && <ThemedText style={styles.errorText}>{chatError}</ThemedText>}
        <TextInput
          value={draft}
          onChangeText={setDraft}
          multiline
          placeholder="Example: chicken rice bowl with veggies"
          style={styles.input}
        />
        <Pressable style={[styles.button, !canSubmit && styles.buttonDisabled]} onPress={onInterpret}>
          <ThemedText type="defaultSemiBold">Estimate Macros</ThemedText>
        </Pressable>
        <Pressable style={styles.button} onPress={onResetSession}>
          <ThemedText type="defaultSemiBold">Reset Chat Session</ThemedText>
        </Pressable>
      </ThemedView>

      {pendingInterpretation && (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Assistant Response</ThemedText>
          {pendingInterpretation.status === 'clarification_needed' ? (
            <>
              <ThemedText>{pendingInterpretation.clarificationQuestion}</ThemedText>
              {!!pendingInterpretation.clarificationOptions?.length && (
                <View style={styles.options}>
                  {pendingInterpretation.clarificationOptions.map((option) => (
                    <Pressable key={option} onPress={() => onChooseClarification(option)}>
                      <ThemedText type="link">{option}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          ) : (
            <>
              <ThemedText type="defaultSemiBold">
                {pendingInterpretation.mealTitle ?? 'Meal estimate'}
              </ThemedText>
              <ThemedText>
                {pendingInterpretation.estimatedMacros?.calories ?? 0} kcal • P{' '}
                {pendingInterpretation.estimatedMacros?.protein ?? 0} • C{' '}
                {pendingInterpretation.estimatedMacros?.carbs ?? 0} • F{' '}
                {pendingInterpretation.estimatedMacros?.fat ?? 0}
              </ThemedText>
              <ThemedText>Confidence: {Math.round(pendingInterpretation.confidence * 100)}%</ThemedText>
              <Pressable style={styles.button} onPress={onSave}>
                <ThemedText type="defaultSemiBold">Confirm and Save</ThemedText>
              </Pressable>
            </>
          )}
        </ThemedView>
      )}

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Recent Chat</ThemedText>
        {recentMessages.length === 0 ? (
          <ThemedText>No chat yet. Start by describing a meal.</ThemedText>
        ) : (
          recentMessages.map((message) => (
            <ThemedView key={message.id} style={styles.chatBubble}>
              <ThemedText type="defaultSemiBold">
                {message.role === 'user' ? 'You' : 'Assistant'}
              </ThemedText>
              <ThemedText>{message.text}</ThemedText>
            </ThemedView>
          ))
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#B9B9B9',
    borderRadius: 10,
    padding: 10,
    textAlignVertical: 'top',
  },
  button: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#B9B9B9',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: '#B00020',
  },
  options: {
    gap: 4,
  },
  chatBubble: {
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
});
