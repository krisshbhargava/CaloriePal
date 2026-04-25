import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import type { MealEntry } from '@/models/domain';

type Theme = (typeof Colors)['light'];

type Props = {
  meal: MealEntry;
  theme: Theme;
  hasPremiumAccess: boolean;
  onNeedPremium: (action: 'meal_rating_tapped' | 'favorite_toggled') => void;
  onPremiumInteraction?: (action: 'meal_rating_tapped' | 'favorite_toggled') => void;
  setMealRating: (mealId: string, rating: number) => void;
  toggleMealFavorite: (mealId: string) => void;
};

export function MealRatingFavoriteRow({
  meal,
  theme,
  hasPremiumAccess,
  onNeedPremium,
  onPremiumInteraction,
  setMealRating,
  toggleMealFavorite,
}: Props) {
  const guard = (action: 'meal_rating_tapped' | 'favorite_toggled') => {
    if (!hasPremiumAccess) {
      onNeedPremium(action);
      return false;
    }
    onPremiumInteraction?.(action);
    return true;
  };

  return (
    <View style={styles.row}>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            hitSlop={6}
            onPress={() => {
              if (!guard('meal_rating_tapped')) return;
              setMealRating(meal.id, star);
            }}>
            <ThemedText style={[styles.star, meal.rating && meal.rating >= star ? styles.starFilled : styles.starEmpty]}>
              ★
            </ThemedText>
          </Pressable>
        ))}
      </View>
      <Pressable
        hitSlop={8}
        onPress={() => {
          if (!guard('favorite_toggled')) return;
          toggleMealFavorite(meal.id);
        }}
        style={[styles.heartBtn, { borderColor: theme.cardBorder }]}>
        <ThemedText style={styles.heart}>{meal.isFavorite ? '♥' : '♡'}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  star: {
    fontSize: 22,
    lineHeight: 26,
  },
  starFilled: {
    opacity: 1,
  },
  starEmpty: {
    opacity: 0.28,
  },
  heartBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heart: {
    fontSize: 20,
    lineHeight: 24,
  },
});
