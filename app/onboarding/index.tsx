import { router } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RaisedPressable } from '@/components/raised-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  ACTIVITY_OPTIONS,
  ActivityLevel,
  MacroPriority,
  PRIORITY_OPTIONS,
  Sex,
  calculateSuggestedMacros,
} from '@/models/onboarding';
import { useAppStore } from '@/store/app-store';
import type { MacroGoals } from '@/store/app-store';

type Step = 'welcome' | 'priority' | 'details' | 'activity' | 'review';
const STEP_ORDER: Step[] = ['welcome', 'priority', 'details', 'activity', 'review'];

const SEX_OPTIONS: { id: Sex; label: string }[] = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'other', label: 'Other' },
];

export default function OnboardingScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useAppStore();

  const [step, setStep] = useState<Step>('welcome');
  const [priority, setPriority] = useState<MacroPriority | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [customGoals, setCustomGoals] = useState<MacroGoals | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const stepIndex = STEP_ORDER.indexOf(step);
  const progress = (stepIndex + 1) / STEP_ORDER.length;

  const ageNum = parseInt(age, 10);
  const weightNum = parseFloat(weight);
  const heightNum = parseFloat(height);

  const detailsValid =
    sex !== null &&
    Number.isFinite(ageNum) && ageNum >= 13 && ageNum <= 100 &&
    Number.isFinite(weightNum) && weightNum >= 30 && weightNum <= 300 &&
    Number.isFinite(heightNum) && heightNum >= 100 && heightNum <= 250;

  const suggestedGoals = useMemo<MacroGoals | null>(() => {
    if (!priority || !sex || !detailsValid || !activityLevel) return null;
    return calculateSuggestedMacros({
      sex,
      age: ageNum,
      weightKg: weightNum,
      heightCm: heightNum,
      activityLevel,
      priority,
    });
  }, [priority, sex, ageNum, weightNum, heightNum, activityLevel, detailsValid]);

  const reviewGoals = customGoals ?? suggestedGoals;

  const goNext = () => {
    setError('');
    const next = STEP_ORDER[stepIndex + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    setError('');
    const prev = STEP_ORDER[stepIndex - 1];
    if (prev) setStep(prev);
  };

  const updateGoal = (key: keyof MacroGoals, text: string) => {
    if (!reviewGoals) return;
    const parsed = parseInt(text, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    setCustomGoals({ ...reviewGoals, [key]: parsed });
  };

  const handleFinish = async () => {
    if (!priority || !sex || !activityLevel || !reviewGoals || !detailsValid) {
      setError('Please complete every step before finishing.');
      return;
    }
    setSubmitting(true);
    try {
      await completeOnboarding(
        {
          priority,
          sex,
          age: ageNum,
          weightKg: weightNum,
          heightCm: heightNum,
          activityLevel,
        },
        reviewGoals
      );
      router.replace('/(tabs)');
    } catch (e) {
      console.error(e);
      setError('Could not save your profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canAdvance = (() => {
    switch (step) {
      case 'welcome': return true;
      case 'priority': return priority !== null;
      case 'details': return detailsValid;
      case 'activity': return activityLevel !== null;
      case 'review': return reviewGoals !== null;
    }
  })();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.headerRow, { paddingTop: insets.top + 16 }]}>
        {step !== 'welcome' ? (
          <Pressable onPress={goBack} hitSlop={12}>
            <ThemedText style={[styles.backText, { color: theme.accent }]}>Back</ThemedText>
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <View style={[styles.progressTrack, { backgroundColor: theme.surface }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%`, backgroundColor: theme.accent },
            ]}
          />
        </View>
        <View style={styles.backPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.centered}>
          {step === 'welcome' && <WelcomeStep theme={theme} />}

          {step === 'priority' && (
            <PriorityStep theme={theme} value={priority} onChange={setPriority} />
          )}

          {step === 'details' && (
            <DetailsStep
              theme={theme}
              sex={sex}
              age={age}
              weight={weight}
              height={height}
              onSexChange={setSex}
              onAgeChange={setAge}
              onWeightChange={setWeight}
              onHeightChange={setHeight}
            />
          )}

          {step === 'activity' && (
            <ActivityStep theme={theme} value={activityLevel} onChange={setActivityLevel} />
          )}

          {step === 'review' && reviewGoals && (
            <ReviewStep theme={theme} goals={reviewGoals} priority={priority} onUpdate={updateGoal} />
          )}

          {error ? (
            <ThemedText style={[styles.error, { color: theme.error }]}>{error}</ThemedText>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <RaisedPressable
          style={[
            styles.primaryButton,
            { backgroundColor: canAdvance ? theme.accent : theme.cardBorder },
          ]}
          shadowColor={theme.accent}
          disabled={!canAdvance || submitting}
          onPress={step === 'review' ? handleFinish : goNext}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.primaryButtonText}>
              {step === 'welcome' ? "Let's go" : step === 'review' ? 'Save & finish' : 'Continue'}
            </ThemedText>
          )}
        </RaisedPressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Steps ──────────────────────────────────────────────────────────────────

function WelcomeStep({ theme }: { theme: typeof Colors.light }) {
  return (
    <View style={styles.stepBlock}>
      <ThemedText type="title" style={styles.heroTitle}>
        Welcome to CaloriePal
      </ThemedText>
      <ThemedText style={[styles.heroSubtitle, { color: theme.textMuted }]}>
        We&apos;ll set up daily macro goals tailored to you in under a minute.
      </ThemedText>

      <ThemedView style={[styles.bulletCard, { backgroundColor: theme.card }]}>
        <BulletRow theme={theme} title="Pick your priority" subtitle="Lose, maintain, or build." />
        <BulletRow theme={theme} title="Tell us about you" subtitle="Age, weight, height, activity." />
        <BulletRow theme={theme} title="Review your goals" subtitle="Tweak any number you like." />
      </ThemedView>
    </View>
  );
}

function BulletRow({
  theme,
  title,
  subtitle,
}: {
  theme: typeof Colors.light;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletDot, { backgroundColor: theme.accent }]} />
      <View style={{ flex: 1 }}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <ThemedText style={[styles.bulletSubtitle, { color: theme.textMuted }]}>{subtitle}</ThemedText>
      </View>
    </View>
  );
}

function PriorityStep({
  theme,
  value,
  onChange,
}: {
  theme: typeof Colors.light;
  value: MacroPriority | null;
  onChange: (v: MacroPriority) => void;
}) {
  return (
    <View style={styles.stepBlock}>
      <ThemedText type="title" style={styles.stepTitle}>What&apos;s your top priority?</ThemedText>
      <ThemedText style={[styles.stepSubtitle, { color: theme.textMuted }]}>
        Choose the goal that matters most. We&apos;ll tune your macros to match.
      </ThemedText>

      <View style={styles.optionsList}>
        {PRIORITY_OPTIONS.map((option) => {
          const selected = value === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => onChange(option.id)}
              style={[
                styles.optionCard,
                {
                  backgroundColor: theme.card,
                  borderColor: selected ? theme.accent : theme.cardBorder,
                  borderWidth: selected ? 2 : 1,
                },
              ]}>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">{option.title}</ThemedText>
                <ThemedText style={[styles.optionDescription, { color: theme.textMuted }]}>
                  {option.description}
                </ThemedText>
              </View>
              {selected ? <View style={[styles.checkmark, { backgroundColor: theme.accent }]} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DetailsStep({
  theme,
  sex,
  age,
  weight,
  height,
  onSexChange,
  onAgeChange,
  onWeightChange,
  onHeightChange,
}: {
  theme: typeof Colors.light;
  sex: Sex | null;
  age: string;
  weight: string;
  height: string;
  onSexChange: (s: Sex) => void;
  onAgeChange: (s: string) => void;
  onWeightChange: (s: string) => void;
  onHeightChange: (s: string) => void;
}) {
  return (
    <View style={styles.stepBlock}>
      <ThemedText type="title" style={styles.stepTitle}>A bit about you</ThemedText>
      <ThemedText style={[styles.stepSubtitle, { color: theme.textMuted }]}>
        These help us estimate your daily calorie needs.
      </ThemedText>

      <ThemedView style={[styles.formCard, { backgroundColor: theme.card }]}>
        <ThemedText style={styles.fieldLabel}>Sex</ThemedText>
        <View style={styles.segmented}>
          {SEX_OPTIONS.map((option) => {
            const selected = sex === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => onSexChange(option.id)}
                style={[
                  styles.segmentedItem,
                  {
                    backgroundColor: selected ? theme.accent : theme.surface,
                    borderColor: selected ? theme.accent : theme.cardBorder,
                  },
                ]}>
                <ThemedText
                  style={[
                    styles.segmentedText,
                    { color: selected ? '#fff' : theme.text },
                  ]}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <FormField theme={theme} label="Age (years)" value={age} onChange={onAgeChange} placeholder="28" />
        <FormField theme={theme} label="Weight (kg)" value={weight} onChange={onWeightChange} placeholder="68" />
        <FormField theme={theme} label="Height (cm)" value={height} onChange={onHeightChange} placeholder="170" />
      </ThemedView>
    </View>
  );
}

function FormField({
  theme,
  label,
  value,
  onChange,
  placeholder,
}: {
  theme: typeof Colors.light;
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.formRow}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.tabIconDefault}
        keyboardType="numeric"
        style={[
          styles.input,
          { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.surface },
        ]}
      />
    </View>
  );
}

function ActivityStep({
  theme,
  value,
  onChange,
}: {
  theme: typeof Colors.light;
  value: ActivityLevel | null;
  onChange: (v: ActivityLevel) => void;
}) {
  return (
    <View style={styles.stepBlock}>
      <ThemedText type="title" style={styles.stepTitle}>How active are you?</ThemedText>
      <ThemedText style={[styles.stepSubtitle, { color: theme.textMuted }]}>
        We use this to estimate your daily calorie burn.
      </ThemedText>

      <View style={styles.optionsList}>
        {ACTIVITY_OPTIONS.map((option) => {
          const selected = value === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => onChange(option.id)}
              style={[
                styles.optionCard,
                {
                  backgroundColor: theme.card,
                  borderColor: selected ? theme.accent : theme.cardBorder,
                  borderWidth: selected ? 2 : 1,
                },
              ]}>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">{option.title}</ThemedText>
                <ThemedText style={[styles.optionDescription, { color: theme.textMuted }]}>
                  {option.description}
                </ThemedText>
              </View>
              {selected ? <View style={[styles.checkmark, { backgroundColor: theme.accent }]} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ReviewStep({
  theme,
  goals,
  priority,
  onUpdate,
}: {
  theme: typeof Colors.light;
  goals: MacroGoals;
  priority: MacroPriority | null;
  onUpdate: (key: keyof MacroGoals, text: string) => void;
}) {
  const priorityLabel = PRIORITY_OPTIONS.find((p) => p.id === priority)?.title ?? '';
  return (
    <View style={styles.stepBlock}>
      <ThemedText type="title" style={styles.stepTitle}>Your daily targets</ThemedText>
      <ThemedText style={[styles.stepSubtitle, { color: theme.textMuted }]}>
        Tuned for &ldquo;{priorityLabel}.&rdquo; Adjust any number that doesn&apos;t feel right.
      </ThemedText>

      <ThemedView style={[styles.summaryCard, { backgroundColor: theme.accent }]}>
        <ThemedText
          lightColor="rgba(255,255,255,0.85)"
          darkColor="rgba(255,255,255,0.85)"
          style={styles.summaryLabel}>
          Daily calories
        </ThemedText>
        <ThemedText
          lightColor="#fff"
          darkColor="#fff"
          type="title"
          style={styles.summaryNumber}>
          {goals.calories}
        </ThemedText>
        <ThemedText
          lightColor="rgba(255,255,255,0.85)"
          darkColor="rgba(255,255,255,0.85)">
          kcal / day
        </ThemedText>
      </ThemedView>

      <ThemedView style={[styles.formCard, { backgroundColor: theme.card }]}>
        <GoalRow
          theme={theme}
          label="Calories"
          unit="kcal"
          value={goals.calories}
          onChange={(t) => onUpdate('calories', t)}
          accent={Colors.macro.calories}
        />
        <GoalRow
          theme={theme}
          label="Protein"
          unit="g"
          value={goals.protein}
          onChange={(t) => onUpdate('protein', t)}
          accent={Colors.macro.protein}
        />
        <GoalRow
          theme={theme}
          label="Carbs"
          unit="g"
          value={goals.carbs}
          onChange={(t) => onUpdate('carbs', t)}
          accent={Colors.macro.carbs}
        />
        <GoalRow
          theme={theme}
          label="Fat"
          unit="g"
          value={goals.fat}
          onChange={(t) => onUpdate('fat', t)}
          accent={Colors.macro.fat}
        />
      </ThemedView>

      <ThemedText style={[styles.disclaimer, { color: theme.textMuted }]}>
        You can update these anytime from the My Macros tab.
      </ThemedText>
    </View>
  );
}

function GoalRow({
  theme,
  label,
  unit,
  value,
  onChange,
  accent,
}: {
  theme: typeof Colors.light;
  label: string;
  unit: string;
  value: number;
  onChange: (text: string) => void;
  accent: string;
}) {
  return (
    <View style={styles.goalRow}>
      <View style={styles.goalLabelWrap}>
        <View style={[styles.goalDot, { backgroundColor: accent }]} />
        <ThemedText style={styles.goalLabel}>{label}</ThemedText>
      </View>
      <View style={styles.goalInputWrap}>
        <TextInput
          value={String(value)}
          onChangeText={onChange}
          keyboardType="number-pad"
          style={[
            styles.goalInput,
            { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.surface },
          ]}
        />
        <ThemedText style={[styles.goalUnit, { color: theme.textMuted }]}>{unit}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  backPlaceholder: {
    width: 48,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  scrollContent: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 8,
    flexGrow: 1,
  },
  centered: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    gap: Layout.sectionGap,
  },
  stepBlock: {
    gap: 16,
  },
  heroTitle: {
    fontSize: 36,
    lineHeight: 42,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  stepTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  stepSubtitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  bulletCard: {
    padding: Layout.cardPadding,
    borderRadius: Layout.borderRadiusMD,
    gap: 14,
    ...Shadows.card,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bulletDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  bulletSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: Layout.borderRadiusMD,
    gap: 12,
    ...Shadows.card,
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  checkmark: {
    width: 14,
    height: 14,
    borderRadius: 999,
  },
  formCard: {
    padding: Layout.cardPadding,
    borderRadius: Layout.borderRadiusMD,
    gap: 14,
    ...Shadows.card,
  },
  formRow: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  segmented: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  segmentedItem: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
  },
  segmentedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCard: {
    padding: 24,
    borderRadius: Layout.borderRadiusLG,
    alignItems: 'center',
    gap: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryNumber: {
    fontSize: 56,
    lineHeight: 60,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  goalLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  goalLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  goalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalInput: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'right',
  },
  goalUnit: {
    fontSize: 13,
    width: 32,
  },
  disclaimer: {
    fontSize: 13,
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 8,
  },
  primaryButton: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
