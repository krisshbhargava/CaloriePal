import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, MicOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { MealBreakdownList } from '@/components/meal-breakdown-list';
import { MealSummaryModal } from '@/components/meal-summary-modal';
import { RaisedPressable } from '@/components/raised-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TypingDots } from '@/components/typing-dots';
import { Colors } from '@/constants/theme';
import { useRemoteConfig } from '@/context/remote-config-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChatSessionStatus, MealDraft } from '@/models/domain';
import { trackVoiceModeToggled } from '@/services/analytics';
import { useAppStore } from '@/store/app-store';

const TOP_INSET_EXTRA = 12;
const LISTENING_CUE = require('../../assets/Sfx/Blip6.wav');
const IS_WEB = Platform.OS === 'web';

function MicPulseRings({ active, color }: { active: boolean; color: string }) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      ring1.setValue(0);
      ring2.setValue(0);
      return;
    }
    const makePulse = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    const a1 = makePulse(ring1, 0);
    const a2 = makePulse(ring2, 420);
    a1.start();
    a2.start();
    return () => {
      a1.stop();
      a2.stop();
    };
  }, [active, ring1, ring2]);

  const ringStyle = (val: Animated.Value) => ({
    position: 'absolute' as const,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: color,
    opacity: val.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.5, 0] }),
    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }],
  });

  if (!active) return null;
  return (
    <>
      <Animated.View pointerEvents="none" style={ringStyle(ring1)} />
      <Animated.View pointerEvents="none" style={ringStyle(ring2)} />
    </>
  );
}

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

  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { showEnhancedSummary, showMealBreakdown } = useRemoteConfig();

  const [draft, setDraft] = useState('');
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('Tap Hands-Free to start talking.');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [recognitionAvailable, setRecognitionAvailable] = useState<boolean | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const listeningCueRef = useRef<Audio.Sound | null>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFinalTranscriptRef = useRef('');
  const latestTranscriptRef = useRef('');
  const shouldResumeListeningRef = useRef(false);
  const voiceModeEnabledRef = useRef(false);
  const chatStatusRef = useRef<ChatSessionStatus>('awaiting_input');
  const activeDraftRef = useRef<MealDraft | null>(null);
  const isInterpretingRef = useRef(false);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const activeDraftSignatureRef = useRef('');
  const lastClarificationIdRef = useRef('');

  const canSubmit = draft.trim().length > 0 && !isInterpreting;
  const isReadyToSave = chatStatus === 'ready_to_confirm' && activeDraft;
  const clarificationOptions =
    chatStatus === 'awaiting_clarification'
      ? (pendingInterpretation?.clarificationOptions ?? [])
      : [];

  const clearRestartTimeout = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  const playListeningCue = useCallback(async () => {
    try {
      if (!listeningCueRef.current) {
        const { sound } = await Audio.Sound.createAsync(LISTENING_CUE, {
          shouldPlay: false,
          volume: 1,
        });
        listeningCueRef.current = sound;
      }

      await listeningCueRef.current.replayAsync();
    } catch {
      // Non-blocking UX affordance only.
    }
  }, []);

  const clearSpeechEndTimeout = useCallback(() => {
    if (speechEndTimeoutRef.current) {
      clearTimeout(speechEndTimeoutRef.current);
      speechEndTimeoutRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    clearRestartTimeout();
    clearSpeechEndTimeout();
    shouldResumeListeningRef.current = false;
    pendingFinalTranscriptRef.current = '';
    latestTranscriptRef.current = '';
    ExpoSpeechRecognitionModule.abort();
  }, [clearRestartTimeout, clearSpeechEndTimeout]);

  const startListening = useCallback(
    (statusText: string) => {
      clearRestartTimeout();

      if (!voiceModeEnabledRef.current || isInterpretingRef.current || isListeningRef.current) {
        return;
      }

      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        setRecognitionAvailable(false);
        setVoiceError('Speech recognition is not available on this build yet.');
        return;
      }

      shouldResumeListeningRef.current = true;
      pendingFinalTranscriptRef.current = '';
      latestTranscriptRef.current = '';
      setVoiceStatus(statusText);
      setLiveTranscript('');

      try {
        ExpoSpeechRecognitionModule.start({
          lang: 'en-US',
          interimResults: !IS_WEB,
          continuous: false,
          addsPunctuation: true,
          maxAlternatives: IS_WEB ? 3 : 1,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Could not start speech recognition.';
        setVoiceError(message);
        setVoiceStatus(message);
      }
    },
    [clearRestartTimeout]
  );

  const speakText = useCallback(
    (text: string, onDone?: () => void) => {
      clearRestartTimeout();
      clearSpeechEndTimeout();
      pendingFinalTranscriptRef.current = '';
      latestTranscriptRef.current = '';
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      setVoiceStatus('Listening...');

      let completed = false;
      const finishSpeaking = (shouldContinue: boolean) => {
        if (completed) return;
        completed = true;
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        if (shouldContinue) {
          onDone?.();
        }
      };

      Speech.speak(text, {
        language: 'en-US',
        rate: 0.97,
        useApplicationAudioSession: false,
        onDone: () => {
          finishSpeaking(true);
        },
        onStopped: () => {
          finishSpeaking(true);
        },
        onError: (error) => {
          finishSpeaking(false);
          setVoiceError(error.message);
          setVoiceStatus(error.message);
        },
      });
    },
    [clearRestartTimeout, clearSpeechEndTimeout]
  );

  const queueListeningRestart = useCallback(() => {
    clearRestartTimeout();
    restartTimeoutRef.current = setTimeout(() => {
      if (voiceModeEnabledRef.current && !isInterpretingRef.current && !isSpeakingRef.current) {
        startListening('Listening...');
      }
    }, 450);
  }, [clearRestartTimeout, startListening]);

  useEffect(() => {
    voiceModeEnabledRef.current = voiceModeEnabled;
  }, [voiceModeEnabled]);

  useEffect(() => {
    chatStatusRef.current = chatStatus;
  }, [chatStatus]);

  useEffect(() => {
    activeDraftRef.current = activeDraft;
  }, [activeDraft]);

  useEffect(() => {
    isInterpretingRef.current = isInterpreting;
  }, [isInterpreting]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    setRecognitionAvailable(ExpoSpeechRecognitionModule.isRecognitionAvailable());
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [chatMessages, isInterpreting, liveTranscript, voiceModeEnabled, voiceStatus]);

  useEffect(() => {
    void Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    return () => {
      clearRestartTimeout();
      clearSpeechEndTimeout();
      shouldResumeListeningRef.current = false;
      Speech.stop().catch(() => undefined);
      ExpoSpeechRecognitionModule.abort();
      listeningCueRef.current?.unloadAsync().catch(() => undefined);
    };
  }, [clearRestartTimeout, clearSpeechEndTimeout]);

  useEffect(() => {
      if (!voiceModeEnabled) {
      lastClarificationIdRef.current = '';
      activeDraftSignatureRef.current = '';
      return;
    }

    if (isInterpreting) {
      stopListening();
      setVoiceStatus('Thinking...');
      return;
    }

    if (chatStatus === 'awaiting_clarification') {
      const latestAssistantMessage = [...chatMessages]
        .reverse()
        .find((message) => message.role === 'assistant');

      if (!latestAssistantMessage || latestAssistantMessage.id === lastClarificationIdRef.current) {
        return;
      }

      lastClarificationIdRef.current = latestAssistantMessage.id;
      if (IS_WEB) {
        speakText(buildClarificationPrompt(latestAssistantMessage.text), () =>
          startListening('Listening for your answer...')
        );
      } else {
        startListening('Listening for your answer...');
        speakText(buildClarificationPrompt(latestAssistantMessage.text));
      }
      return;
    }

    if (chatStatus === 'ready_to_confirm' && activeDraft) {
      const signature = [
        activeDraft.mealTitle,
        activeDraft.estimatedMacros.calories,
        activeDraft.estimatedMacros.protein,
        activeDraft.estimatedMacros.carbs,
        activeDraft.estimatedMacros.fat,
      ].join('|');

      if (signature === activeDraftSignatureRef.current) {
        return;
      }

      activeDraftSignatureRef.current = signature;
      if (IS_WEB) {
        speakText(buildConfirmationPrompt(activeDraft, true), () =>
          startListening('Listening for save or changes...')
        );
      } else {
        startListening('Listening for save or changes...');
        speakText(buildConfirmationPrompt(activeDraft, false));
      }
      return;
    }
  }, [
    activeDraft,
    chatMessages,
    chatStatus,
    editingMealId,
    isInterpreting,
    isListening,
    pendingInterpretation?.clarificationOptions,
    speakText,
    startListening,
    stopListening,
    voiceModeEnabled,
  ]);

  useEffect(() => {
    if (!voiceModeEnabled || !chatError) {
      return;
    }

    speakText(`I hit an issue. ${chatError}`);
  }, [chatError, speakText, voiceModeEnabled]);

  useSpeechRecognitionEvent('start', () => {
    clearSpeechEndTimeout();
    setIsListening(true);
    isListeningRef.current = true;
    setLiveTranscript('');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript?.trim();
    if (!transcript) return;

    if (!IS_WEB && isSpeakingRef.current) {
      Speech.stop().catch(() => undefined);
    }

    latestTranscriptRef.current = transcript;
    setLiveTranscript(transcript);
    if (event.isFinal) {
      pendingFinalTranscriptRef.current = transcript;
    }
  });

  useSpeechRecognitionEvent('speechend', () => {
    clearSpeechEndTimeout();
    speechEndTimeoutRef.current = setTimeout(() => {
      ExpoSpeechRecognitionModule.stop();
    }, 250);
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    isListeningRef.current = false;

    if (!voiceModeEnabledRef.current) {
      return;
    }

    if (event.error === 'aborted') {
      return;
    }

    if (event.error === 'no-speech' || event.error === 'speech-timeout') {
      setVoiceStatus("Didn't catch that. Listening again...");
      queueListeningRestart();
      return;
    }

    setVoiceError(event.message);
    setVoiceStatus(event.message);
  });

  useSpeechRecognitionEvent('end', () => {
    clearSpeechEndTimeout();
    setIsListening(false);
    isListeningRef.current = false;

    const transcript =
      pendingFinalTranscriptRef.current.trim() || latestTranscriptRef.current.trim();
    pendingFinalTranscriptRef.current = '';
    latestTranscriptRef.current = '';

    if (transcript) {
      void handleVoiceTranscript(transcript);
      return;
    }

    if (
      voiceModeEnabledRef.current &&
      shouldResumeListeningRef.current &&
      !isSpeakingRef.current &&
      !isInterpretingRef.current
    ) {
      queueListeningRestart();
    }
  });

  const onSend = async () => {
    if (!canSubmit) return;
    const text = draft.trim();
    setDraft('');
    await sendMessage(text, 'text');
  };

  const onSelectOption = async (option: string) => {
    await sendMessage(option, 'text');
  };

  const onSave = () => {
    saveMealFromInterpretation(draft);
    setDraft('');
  };

  const stopVoiceMode = useCallback(() => {
    clearRestartTimeout();
    clearSpeechEndTimeout();
    shouldResumeListeningRef.current = false;
    pendingFinalTranscriptRef.current = '';
    latestTranscriptRef.current = '';
    lastClarificationIdRef.current = '';
    activeDraftSignatureRef.current = '';
    setVoiceModeEnabled(false);
    trackVoiceModeToggled(false);
    setVoiceStatus('Hands-free is off.');
    setLiveTranscript('');
    setIsSpeaking(false);
    setIsListening(false);
    isListeningRef.current = false;
    isSpeakingRef.current = false;
    Speech.stop().catch(() => undefined);
    ExpoSpeechRecognitionModule.abort();
  }, [clearRestartTimeout, clearSpeechEndTimeout]);

  const onReset = () => {
    stopVoiceMode();
    resetChatSession();
    setDraft('');
  };

  const toggleVoiceMode = async () => {
    if (voiceModeEnabled) {
      stopVoiceMode();
      return;
    }

    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setRecognitionAvailable(false);
      setVoiceError('Speech recognition is not available on this build yet.');
      return;
    }

    const permissions = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permissions.granted) {
      setVoiceError('Microphone and speech permissions are required for hands-free logging.');
      return;
    }

    setVoiceError(null);
    setRecognitionAvailable(true);
    setVoiceModeEnabled(true);
    trackVoiceModeToggled(true);
    setVoiceStatus('Listening...');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    void playListeningCue();
    setTimeout(() => {
      startListening(editingMealId ? 'Listening for your edit...' : 'Listening for your meal...');
    }, 50);
  };

  async function handleVoiceTranscript(transcript: string) {
    if (isStopVoiceCommand(transcript)) {
      stopVoiceMode();
      return;
    }

    setVoiceError(null);
    setVoiceStatus('Sending...');
    setLiveTranscript(transcript);
    shouldResumeListeningRef.current = false;

    if (chatStatusRef.current === 'ready_to_confirm' && activeDraftRef.current) {
      const command = getVoiceConfirmationCommand(transcript);

      if (command === 'save') {
        const meal = saveMealFromInterpretation(activeDraftRef.current.sourceText, {
          suppressSavedMealModal: true,
          resetChatSessionAfterSave: true,
        });

        if (meal) {
          activeDraftSignatureRef.current = '';
          lastClarificationIdRef.current = '';
          if (IS_WEB) {
            speakText(`Saved ${meal.title}.`, () =>
              startListening('Listening for your next meal...')
            );
          } else {
            startListening('Listening for your next meal...');
            speakText(`Saved ${meal.title}.`);
          }
        }
        return;
      }

      if (command === 'retry') {
        if (IS_WEB) {
          speakText('Okay.', () => startListening('Listening for your correction...'));
        } else {
          startListening('Listening for your correction...');
          speakText('Okay.');
        }
        return;
      }
    }

    await sendMessage(transcript, 'voice');
  }

  return (
    <>
      <MealSummaryModal
        meal={lastSavedMeal}
        onDone={clearLastSavedMeal}
        enabled={!voiceModeEnabled && showEnhancedSummary}
      />
      {!showEnhancedSummary && !!lastSavedMeal && (
        <SimpleToast
          message={`Saved: ${lastSavedMeal.title} — ${lastSavedMeal.calories} kcal`}
          onDismiss={clearLastSavedMeal}
        />
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}>
        <ScrollView
          ref={scrollRef}
          style={[styles.flex, { backgroundColor: theme.background }]}
          contentContainerStyle={[
            styles.messageList,
            { paddingTop: insets.top + TOP_INSET_EXTRA },
          ]}
          keyboardShouldPersistTaps="handled">
          {chatMessages.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText type="title" style={styles.emptyTitle}>
                {editingMealId ? 'Edit Meal' : 'CaloriePal'}
              </ThemedText>
              <ThemedText style={styles.emptyHint}>
                Tell me what you ate and I&apos;ll only ask follow-up questions when a missing
                detail could meaningfully change the estimate.
              </ThemedText>
            </View>
          ) : (
            chatMessages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.bubble,
                  msg.role === 'user'
                    ? [styles.bubbleUser, { backgroundColor: theme.accent }]
                    : [styles.bubbleAssistant, { backgroundColor: theme.surface }],
                ]}>
                <ThemedText
                  style={
                    msg.role === 'user'
                      ? [styles.bubbleTextUser, { color: theme.background }]
                      : undefined
                  }>
                  {msg.text}
                </ThemedText>
              </View>
            ))
          )}

          {clarificationOptions.length > 0 && !isInterpreting && (
            <View style={styles.chipsContainer}>
              {clarificationOptions.map((option) => (
                <Pressable
                  key={option}
                  style={({ pressed }) => [
                    styles.chip,
                    { borderColor: theme.primary, backgroundColor: theme.surface },
                    pressed && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => onSelectOption(option)}>
                  {({ pressed }) => (
                    <ThemedText
                      style={[
                        styles.chipText,
                        { color: pressed ? theme.background : theme.primary },
                      ]}>
                      {option}
                    </ThemedText>
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {voiceModeEnabled && (
            <ThemedView
              style={[
                styles.voiceCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.cardBorder,
                },
              ]}>
              <View style={styles.voiceHeader}>
                <ThemedText type="defaultSemiBold">Hands-Free</ThemedText>
                <ThemedText style={[styles.voiceBadge, { color: theme.accent }]}> 
                  {isListening ? 'Listening' : isSpeaking ? 'Speaking' : 'Ready'}
                </ThemedText>
              </View>
              <ThemedText style={styles.voiceStatus}>{voiceStatus}</ThemedText>
              {!!liveTranscript && (
                <ThemedText style={styles.voiceTranscript}>&quot;{liveTranscript}&quot;</ThemedText>
              )}
              {!!voiceError && <ThemedText style={[styles.voiceError, { color: theme.error }]}>{voiceError}</ThemedText>}
            </ThemedView>
          )}

          {isInterpreting && (
            <View
              style={[
                styles.bubble,
                styles.bubbleAssistant,
                styles.typingBubble,
                { backgroundColor: theme.surface },
              ]}>
              <TypingDots color={theme.accent} />
            </View>
          )}

          {!!chatError && (
            <ThemedView style={[styles.errorBanner, { backgroundColor: theme.errorSurface }]}>
              <ThemedText style={[styles.errorText, { color: theme.error }]}>{chatError}</ThemedText>
            </ThemedView>
          )}
        </ScrollView>

        {isReadyToSave && (
          <ThemedView style={[styles.actionBar, { borderTopColor: theme.cardBorder }]}>
            <View style={styles.macroRow}>
              <ThemedText type="defaultSemiBold">{activeDraft.mealTitle}</ThemedText>
              <ThemedText style={styles.macroText}>
                {activeDraft.estimatedMacros.calories} kcal · {activeDraft.estimatedMacros.protein}
                g P · {activeDraft.estimatedMacros.carbs}g C · {activeDraft.estimatedMacros.fat}g
                F
              </ThemedText>
            </View>
            {showMealBreakdown && <MealBreakdownList components={activeDraft.components} compact />}
            <View style={styles.actionButtons}>
              <RaisedPressable
                style={[styles.actionBtn, styles.saveBtn, { backgroundColor: theme.primary }]}
                onPress={onSave}>
                <ThemedText style={[styles.saveBtnText, { color: '#fff' }]}>
                  {editingMealId ? 'Save Changes' : 'Save Meal'}
                </ThemedText>
              </RaisedPressable>
              <Pressable
                style={[styles.actionBtn, { borderColor: theme.cardBorder }]}
                onPress={onReset}>
                <ThemedText>Start Over</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        )}

        <ThemedView style={[styles.inputBar, { borderTopColor: theme.cardBorder }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={
              chatStatus === 'awaiting_clarification'
                ? 'Or type your own answer...'
                : 'e.g. chicken nuggets with sauce...'
            }
            placeholderTextColor={theme.tabIconDefault}
            style={[styles.input, { borderColor: theme.cardBorder, color: theme.text }]}
            multiline
            returnKeyType="send"
            onSubmitEditing={onSend}
            editable={!isInterpreting}
          />
          <View style={styles.micWrapper}>
            <MicPulseRings active={isListening} color={theme.accent} />
            <RaisedPressable
              style={[
                styles.voiceBtn,
                {
                  backgroundColor: voiceModeEnabled ? theme.accent : theme.surface,
                  borderColor: theme.cardBorder,
                },
              ]}
              shadowColor={voiceModeEnabled ? theme.accent : theme.primary}
              onPress={() => void toggleVoiceMode()}>
              {voiceModeEnabled
                ? <Mic size={22} color={theme.background} />
                : <MicOff size={22} color={theme.text} />}
            </RaisedPressable>
          </View>
          <RaisedPressable
            style={[
              styles.sendBtn,
              { backgroundColor: theme.primary },
              !canSubmit && [styles.sendBtnDisabled, { backgroundColor: theme.surface }],
            ]}
            onPress={onSend}
            disabled={!canSubmit}>
            <ThemedText style={[styles.sendBtnText, { color: '#fff' }]}>↑</ThemedText>
          </RaisedPressable>
        </ThemedView>

        {recognitionAvailable === false && (
          <ThemedView style={[styles.devBuildHint, { borderTopColor: theme.cardBorder }]}>
            <ThemedText style={styles.devBuildHintText}>
              Hands-free needs speech recognition support in the installed build. If this is Expo
              Go, rebuild with the native module first.
            </ThemedText>
          </ThemedView>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

function SimpleToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <View style={toastStyles.container} pointerEvents="none">
      <View style={toastStyles.toast}>
        <ThemedText style={toastStyles.text}>{message}</ThemedText>
      </View>
    </View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  toast: {
    backgroundColor: 'rgba(15,15,26,0.85)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  micWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function buildClarificationPrompt(question: string) {
  return question;
}

function buildConfirmationPrompt(activeDraft: MealDraft, isWeb: boolean) {
  const macros = activeDraft.estimatedMacros;
  return `I estimate ${activeDraft.mealTitle} at about ${macros.calories} calories, ${macros.protein} grams of protein, ${macros.carbs} grams of carbs, and ${macros.fat} grams of fat. ${isWeb ? 'Say save meal to log it, or say change meal.' : 'Say save to log it, or tell me what to change.'}`;
}

function getVoiceConfirmationCommand(transcript: string): 'save' | 'retry' | 'message' {
  const normalized = transcript.trim().toLowerCase();
  const compact = normalized.replace(/[^\w\s]/g, ' ');
  const shortReply = compact.split(/\s+/).filter(Boolean).length <= 4;

  if (
    /\b(save|safe|saved|save meal|log meal|log it|yes|yep|yeah|correct|looks right|that'?s right|sounds good)\b/.test(compact)
  ) {
    return 'save';
  }

  if (
    shortReply &&
    /\b(no|nope|wrong|change|change meal|edit|not quite|try again|fix it)\b/.test(compact)
  ) {
    return 'retry';
  }

  return 'message';
}

function isStopVoiceCommand(transcript: string) {
  const compact = transcript.trim().toLowerCase().replace(/[^\w\s]/g, ' ');
  return /\b(stop|stop listening|be quiet|quiet|cancel voice|turn off voice|mute)\b/.test(compact);
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
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  bubbleTextUser: {},
  typingBubble: { paddingVertical: 14, paddingHorizontal: 18 },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingLeft: 4,
    paddingTop: 2,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 14, fontWeight: '600' as const },
  voiceCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    marginTop: 4,
  },
  voiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voiceBadge: {
    fontSize: 12,
    fontWeight: '700' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  voiceStatus: {
    fontSize: 14,
    lineHeight: 20,
  },
  voiceTranscript: {
    opacity: 0.75,
    fontStyle: 'italic',
  },
  voiceError: {
    fontSize: 13,
  },
  errorBanner: { borderRadius: 12, padding: 12 },
  errorText: { fontSize: 13 },
  actionBar: {
    padding: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  macroRow: { gap: 2 },
  macroText: { opacity: 0.7, fontSize: 13 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
  saveBtn: { borderWidth: 0 },
  saveBtnText: { fontWeight: '700' as const },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '400' as const,
    maxHeight: 100,
  },
  voiceBtn: {
    minHeight: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  voiceBtnText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {},
  sendBtnText: { fontSize: 18, fontWeight: '700' as const },
  devBuildHint: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  devBuildHintText: {
    fontSize: 12,
    opacity: 0.65,
    lineHeight: 18,
  },
});
