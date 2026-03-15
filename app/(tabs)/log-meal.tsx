import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Layout } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [draft, setDraft] = useState('');

  const canSubmit = draft.trim().length > 3;

  const recentMessages = useMemo(() => chatMessages.slice(-4), [chatMessages]);

  const onInterpret = () => {
    if (!canSubmit) return;
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

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.centered}>
        <ThemedView style={[styles.headerCard, { backgroundColor: theme.accent }]}>
          <ThemedText type="title" lightColor={theme.background} darkColor={theme.background}>
            Log New Meal
          </ThemedText>
          <ThemedText lightColor="rgba(255,255,255,0.9)" darkColor="rgba(255,255,255,0.9)">
            Describe your meal in your own words.
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.section, styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <ThemedText type="defaultSemiBold">What did you eat?</ThemedText>
          <ThemedText>Status: {chatStatus.replaceAll('_', ' ')}</ThemedText>
          {!!chatError && (
            <ThemedText style={[styles.errorText, { color: '#b91c1c' }]}>{chatError}</ThemedText>
          )}
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            placeholder="e.g. chicken rice bowl with veggies"
            placeholderTextColor={theme.tabIconDefault}
            style={[styles.input, { borderColor: theme.cardBorder, color: theme.text }]}
          />
          <Pressable
            style={[
              styles.buttonPrimary,
              { backgroundColor: theme.primary },
              !canSubmit && styles.buttonDisabled,
            ]}
            onPress={onInterpret}>
            <ThemedText style={{ color: theme.accent }} type="defaultSemiBold">
              Estimate Macros
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.buttonSecondary, { borderColor: theme.cardBorder }]}
            onPress={() => resetChatSession()}>
            <ThemedText type="defaultSemiBold">Reset session</ThemedText>
          </Pressable>
        </ThemedView>

        {pendingInterpretation && (
          <ThemedView style={[styles.section, styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <ThemedText type="subtitle">Assistant response</ThemedText>
            {pendingInterpretation.status === 'clarification_needed' ? (
              <>
                <ThemedText>{pendingInterpretation.clarificationQuestion}</ThemedText>
                {!!pendingInterpretation.clarificationOptions?.length && (
                  <View style={styles.options}>
                    {pendingInterpretation.clarificationOptions.map((option) => (
                      <Pressable
                        key={option}
                        style={[styles.optionChip, { borderColor: theme.accent }]}
                        onPress={() => onChooseClarification(option)}>
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
                <Pressable
                  style={[styles.buttonPrimary, { backgroundColor: theme.primary }]}
                  onPress={onSave}>
                  <ThemedText style={{ color: theme.accent }} type="defaultSemiBold">
                    Confirm and save
                  </ThemedText>
                </Pressable>
              </>
            )}
          </ThemedView>
        )}

        <ThemedView style={[styles.section, styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <ThemedText type="subtitle">Recent chat</ThemedText>
          {recentMessages.length === 0 ? (
            <ThemedText>No chat yet. Describe a meal above to start.</ThemedText>
          ) : (
            recentMessages.map((message) => (
              <ThemedView
                key={message.id}
                style={[
                  styles.chatBubble,
                  {
                    backgroundColor: message.role === 'user' ? theme.surface : theme.accent,
                  },
                ]}>
                <ThemedText
                  type="defaultSemiBold"
                  lightColor={message.role === 'user' ? undefined : theme.background}
                  darkColor={message.role === 'user' ? undefined : theme.background}>
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </ThemedText>
                <ThemedText
                  lightColor={message.role === 'user' ? undefined : theme.background}
                  darkColor={message.role === 'user' ? undefined : theme.background}>
                  {message.text}
                </ThemedText>
              </ThemedView>
            ))
          )}
        </ThemedView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: Layout.screenPadding,
    paddingBottom: 40,
    flexGrow: 1,
  },
  centered: {
    maxWidth: Layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Layout.sectionGap,
  },
  headerCard: {
    padding: Layout.cardPadding,
    borderRadius: 16,
    gap: 8,
  },
  section: {
    padding: Layout.cardPadding,
    borderRadius: 16,
    gap: 12,
  },
  card: {
    borderWidth: 1,
  },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  buttonPrimary: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonSecondary: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: 14,
  },
  options: {
    gap: 8,
  },
  optionChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  chatBubble: {
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
});
