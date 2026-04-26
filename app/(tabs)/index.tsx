import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EditMealModal } from '@/components/edit-meal-modal';
import { MealBreakdownList } from '@/components/meal-breakdown-list';
import { MealRatingFavoriteRow } from '@/components/meal-rating-favorite-row';
import { RaisedPressable } from '@/components/raised-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MealEntry } from '@/models/domain';
import { useAuth } from '@/context/auth-context';
import { trackPremiumExperimentInteraction } from '@/services/analytics';
import { getDailyMacroSummary } from '@/services/macro-aggregation';
import { recordPremiumExperimentInteraction, recordPremiumUpsellClick } from '@/services/firestore';
import { useAppStore } from '@/store/app-store';

const TOP_INSET_EXTRA = 12;

async function pickWebImageUri(): Promise<string | null> {
  if (typeof document === 'undefined') return null;

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve(URL.createObjectURL(file));
    };
    input.click();
  });
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const {
    meals,
    editMeal,
    startEditSession,
    macroGoals,
    attachMealPhoto,
    hasPremiumAccess,
    premiumExperimentVariant,
    premiumPrice,

    setMealRating,
    toggleMealFavorite,
  } = useAppStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const summary = getDailyMacroSummary(meals, new Date());
  const todaysMeals = meals.filter((meal) => meal.timestamp.slice(0, 10) === summary.dateKey);
  const favoriteMeals = meals.filter((meal) => meal.isFavorite);
  const theme = Colors[colorScheme];
  const hasNoMeals = meals.length === 0;

  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);
  const [showPremiumPaywall, setShowPremiumPaywall] = useState(false);
  const [paywallSource, setPaywallSource] = useState('dashboard');

  const goToLogMeal = () => router.push('/(tabs)/log-meal');

  const recordPremiumInteraction = useCallback(
    (action: Parameters<typeof recordPremiumExperimentInteraction>[0]['action'], source: string) => {
      const variant = premiumExperimentVariant ?? 'no_access';
      if (user?.uid) {
        recordPremiumExperimentInteraction({ uid: user.uid, variant, action }).catch(console.error);
      }
      trackPremiumExperimentInteraction({
        action,
        variant: premiumExperimentVariant ?? 'unknown',
        source,
        hasPremiumAccess,
      });
    },
    [hasPremiumAccess, premiumExperimentVariant, user?.uid]
  );

  const openPremiumPaywall = useCallback(
    (source: string) => {
      setPaywallSource(source);
      setShowPremiumPaywall(true);
      recordPremiumInteraction('paywall_viewed', source);
    },
    [recordPremiumInteraction]
  );

  const closePremiumPaywall = useCallback(() => {
    if (showPremiumPaywall) {
      recordPremiumInteraction('paywall_dismissed', paywallSource);
    }
    setShowPremiumPaywall(false);
  }, [paywallSource, recordPremiumInteraction, showPremiumPaywall]);

  const handleAttachPhoto = async (mealId: string) => {
    recordPremiumInteraction('attach_photo_attempted', 'dashboard_meal_card');

    if (!hasPremiumAccess) {
      if (user?.uid) recordPremiumUpsellClick(user.uid).catch(console.error);
      openPremiumPaywall('dashboard_attach_photo');
      return;
    }

    let pickedUri: string | null = null;

    if (Platform.OS === 'web') {
      pickedUri = await pickWebImageUri();
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Please allow photo library access to attach meal photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        pickedUri = result.assets[0].uri;
      }
    }

    if (!pickedUri) return;

    recordPremiumInteraction('attach_photo_selected', 'dashboard_meal_card');
    try {
      await attachMealPhoto(mealId, pickedUri);
    } catch (error) {
      console.error(error);
      Alert.alert('Upload failed', 'Could not upload the image. Please try again.');
    }
  };

  return (
    <>
      <Modal visible={showPremiumPaywall} transparent animationType="fade" onRequestClose={closePremiumPaywall}>
        <View style={styles.paywallOverlay}>
          <ThemedView style={[styles.paywallCard, { backgroundColor: theme.card }]}>
            <ThemedText type="subtitle">Premium Feature</ThemedText>
            <ThemedText>
              Photo uploads are available on Premium for {premiumPrice}/month.
            </ThemedText>
            <View style={styles.paywallActions}>
              <Pressable
                onPress={closePremiumPaywall}
                style={[styles.photoAttachButton, { borderColor: theme.cardBorder, backgroundColor: theme.surface }]}>
                <ThemedText>Not now</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  recordPremiumInteraction('switch_to_paid_alpha_clicked', paywallSource);
                  setShowPremiumPaywall(false);
                }}
                style={[styles.photoAttachButton, { borderColor: theme.cardBorder, backgroundColor: theme.surface, opacity: 0.45 }]}>
                <ThemedText>Upgrade (coming soon)</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>

      <EditMealModal
        meal={editingMeal}
        onClose={() => setEditingMeal(null)}
        onSaveManual={(id, updates) => editMeal(id, updates)}
        onEditWithAI={(meal) => startEditSession(meal)}
      />

      <ScrollView
        style={[styles.scroll, { backgroundColor: theme.background }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + TOP_INSET_EXTRA }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centered}>
          <ThemedView style={[styles.headerCard, { backgroundColor: theme.accent }]}>
            <View style={styles.headerCardTop}>
              <ThemedText type="title" lightColor={theme.background} darkColor={theme.background}>
                Today&apos;s Progress
              </ThemedText>
            </View>
            <ThemedText lightColor="rgba(255,255,255,0.9)" darkColor="rgba(255,255,255,0.9)">
              Low-pressure progress. Log what you can.
            </ThemedText>
          </ThemedView>

          <ThemedView style={[styles.section, styles.card, { backgroundColor: theme.card }]}>
            <ThemedText type="subtitle">Daily progress</ThemedText>
            <ThemedText style={styles.progressHint}>Progress toward your daily goals (set in My Macros).</ThemedText>
            <ProgressBar
              label="Calories"
              current={summary.totals.calories}
              goal={macroGoals.calories}
              unit="kcal"
              theme={theme}
              color={Colors.macro.calories}
            />
            <ProgressBar
              label="Protein"
              current={summary.totals.protein}
              goal={macroGoals.protein}
              unit="g"
              theme={theme}
              color={Colors.macro.protein}
            />
            <ProgressBar
              label="Carbs"
              current={summary.totals.carbs}
              goal={macroGoals.carbs}
              unit="g"
              theme={theme}
              color={Colors.macro.carbs}
            />
            <ProgressBar
              label="Fat"
              current={summary.totals.fat}
              goal={macroGoals.fat}
              unit="g"
              theme={theme}
              color={Colors.macro.fat}
            />
          </ThemedView>

          <ThemedView style={[styles.section, styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText type="subtitle">Today&apos;s Meals</ThemedText>
              {hasPremiumAccess && (
                <ThemedText style={[styles.premiumBadge, { color: theme.accent, borderColor: theme.accent }]}>
                  PREMIUM
                </ThemedText>
              )}
            </View>
            {todaysMeals.length === 0 ? (
              <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
                <ThemedText>
                  {hasNoMeals
                    ? "You haven't logged any meals yet."
                    : "No meals logged yet today."}
                </ThemedText>
                <RaisedPressable
                  style={[styles.addMealButton, { backgroundColor: theme.primary }]}
                  onPress={goToLogMeal}
                >
                  <ThemedText style={[styles.addMealButtonText, { color: '#fff' }]}>
                    {hasNoMeals ? 'Add your first meal' : 'Log a meal'}
                  </ThemedText>
                </RaisedPressable>
              </ThemedView>
            ) : (
              todaysMeals.map((meal) => (
                <ThemedView
                  key={meal.id}
                  style={[styles.mealCard, { backgroundColor: theme.surface, borderLeftColor: theme.primary }]}
                >
                  <ThemedText type="defaultSemiBold" style={styles.mealTitle} numberOfLines={1}>
                    {meal.title}
                  </ThemedText>
                  <ThemedText style={styles.mealDescription} numberOfLines={2}>
                    {meal.description}
                  </ThemedText>
                  <ThemedText style={styles.mealMacros}>
                    {meal.calories} kcal · P {meal.protein}g · C {meal.carbs}g · F {meal.fat}g
                  </ThemedText>
                  {!!meal.photoUri && (
                    <Image source={{ uri: meal.photoUri }} style={styles.mealPhoto} contentFit="cover" />
                  )}
                  <Pressable
                    onPress={() => void handleAttachPhoto(meal.id)}
                    style={[
                      styles.photoAttachButton,
                      {
                        borderColor: theme.cardBorder,
                        backgroundColor: theme.background,
                      },
                    ]}>
                    <ThemedText style={{ color: theme.accent }}>
                      {meal.photoUri ? 'Change photo' : 'Attach photo (Premium)'}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => setEditingMeal(meal)}
                    style={[
                      styles.photoAttachButton,
                      {
                        borderColor: theme.accent,
                        backgroundColor: theme.primaryMuted,
                      },
                    ]}>
                    <ThemedText style={{ color: theme.accent }}>Edit meal</ThemedText>
                  </Pressable>
                  <MealBreakdownList components={meal.components} compact />
                  <MealRatingFavoriteRow
                    meal={meal}
                    theme={theme}
                    hasPremiumAccess={hasPremiumAccess}
                    onNeedPremium={(action) => openPremiumPaywall(`dashboard_${action}`)}
                    onPremiumInteraction={(action) => recordPremiumInteraction(action, `dashboard_${action}`)}
                    setMealRating={setMealRating}
                    toggleMealFavorite={toggleMealFavorite}
                  />
                </ThemedView>
              ))
            )}
          </ThemedView>

          <ThemedView style={[styles.section, styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText type="subtitle">Favorite Meals</ThemedText>
              {hasPremiumAccess && (
                <ThemedText style={[styles.premiumBadge, { color: theme.accent, borderColor: theme.accent }]}>
                  PREMIUM
                </ThemedText>
              )}
            </View>

            {!hasPremiumAccess ? (
              <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
                <ThemedText>
                  Favorite meals is a premium feature. Save go-to meals and find them quickly.
                </ThemedText>
                <Pressable
                  onPress={() => {
                    recordPremiumInteraction('favorites_unlock_clicked', 'dashboard_favorites_section');
                    openPremiumPaywall('dashboard_favorites_unlock');
                  }}
                  style={[
                    styles.photoAttachButton,
                    { borderColor: theme.accent, backgroundColor: theme.primaryMuted },
                  ]}>
                  <ThemedText style={{ color: theme.accent }}>Unlock favorites</ThemedText>
                </Pressable>
              </ThemedView>
            ) : favoriteMeals.length === 0 ? (
              <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
                <ThemedText>
                  No favorites yet. Tap the heart on a meal card to add it here.
                </ThemedText>
              </ThemedView>
            ) : (
              favoriteMeals.slice(0, 8).map((meal) => (
                <ThemedView
                  key={`favorite-${meal.id}`}
                  style={[styles.favoriteCard, { backgroundColor: theme.surface, borderLeftColor: theme.primary }]}>
                  <ThemedText type="defaultSemiBold" numberOfLines={1}>
                    {meal.title}
                  </ThemedText>
                  <ThemedText style={styles.mealMacros}>
                    {meal.calories} kcal · P {meal.protein}g · C {meal.carbs}g · F {meal.fat}g
                  </ThemedText>
                  {!!meal.photoUri && (
                    <Image source={{ uri: meal.photoUri }} style={styles.favoriteThumb} contentFit="cover" />
                  )}
                  <Pressable
                    onPress={() => setEditingMeal(meal)}
                    style={[
                      styles.photoAttachButton,
                      {
                        borderColor: theme.accent,
                        backgroundColor: theme.primaryMuted,
                      },
                    ]}>
                    <ThemedText style={{ color: theme.accent }}>Open meal</ThemedText>
                  </Pressable>
                </ThemedView>
              ))
            )}
          </ThemedView>
        </View>
      </ScrollView>
    </>
  );
}

function ProgressBar({
  label,
  current,
  goal,
  unit,
  theme,
  color,
}: {
  label: string;
  current: number;
  goal: number;
  unit: string;
  theme: (typeof Colors)['light'];
  color?: string;
}) {
  const safeGoal = goal > 0 ? goal : 1;
  const percent = Math.min(100, Math.round((current / safeGoal) * 100));
  const isOver = current > safeGoal;
  const fillColor = color ?? (isOver ? theme.accent : theme.primary);

  return (
    <View style={styles.progressBarRow}>
      <View style={styles.progressBarHeader}>
        <ThemedText type="defaultSemiBold">{label}</ThemedText>
        <ThemedText style={styles.progressBarValues}>
          {current} / {goal} {unit}
        </ThemedText>
      </View>
      <View style={[styles.progressBarTrack, { backgroundColor: theme.surface }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${percent}%`,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
    </View>
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
    padding: 24,
    borderRadius: 28,
    gap: 8,
  },
  headerCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  section: {
    padding: Layout.cardPadding,
    borderRadius: 20,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  premiumBadge: {
    fontSize: 11,
    fontWeight: '700' as const,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  card: { ...Shadows.card },
  progressHint: {
    fontSize: 14,
    opacity: 0.85,
    marginBottom: 4,
  },
  progressBarRow: {
    gap: 6,
  },
  progressBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarValues: {
    fontSize: 14,
    opacity: 0.9,
  },
  progressBarTrack: {
    height: 13,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  mealCard: {
    borderRadius: 20,
    padding: 14,
    gap: 4,
    borderLeftWidth: 4,
  },
  favoriteCard: {
    borderRadius: 16,
    padding: 12,
    gap: 6,
    borderLeftWidth: 4,
  },
  favoriteThumb: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginTop: 4,
  },
  mealTitle: {
    fontWeight: '600' as const,
    fontSize: 16,
    marginBottom: 2,
  },
  mealDescription: { opacity: 0.7, fontSize: 13, lineHeight: 18 },
  mealMacros: { fontSize: 13, opacity: 0.85, marginTop: 4 },
  mealPhoto: {
    marginTop: 8,
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  photoAttachButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyState: {
    gap: 12,
    borderRadius: 16,
    padding: 14,
  },
  addMealButton: {
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  addMealButtonText: {
    fontWeight: '600' as const,
    fontSize: 16,
  },
  paywallOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  paywallCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  paywallActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
});
