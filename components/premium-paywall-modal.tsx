import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  visible: boolean;
  onClose: () => void;
  premiumPrice: string;
  onSwitchToPaidAlpha: () => void | Promise<void>;
};

export function PremiumPaywallModal({ visible, onClose, premiumPrice, onSwitchToPaidAlpha }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ThemedView style={[styles.card, { backgroundColor: theme.card }]}>
          <ThemedText type="subtitle">Chronobite Premium</ThemedText>
          <ThemedText>
            Unlock photo uploads, meal ratings, favorites, and more for {premiumPrice}/month.
          </ThemedText>
          <Pressable
            style={[styles.alphaButton, { backgroundColor: theme.primary }]}
            onPress={() => void Promise.resolve(onSwitchToPaidAlpha()).then(onClose)}>
            <ThemedText style={[styles.alphaButtonText, { color: theme.accent }]}>Switch to paid (alpha test)</ThemedText>
          </Pressable>
          <ThemedText style={styles.alphaHint}>
            For alpha testing only: enables all premium features on this device without checkout.
          </ThemedText>
          <View style={styles.row}>
            <Pressable
              onPress={onClose}
              style={[styles.secondaryBtn, { borderColor: theme.cardBorder, backgroundColor: theme.surface }]}>
              <ThemedText>Not now</ThemedText>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={[styles.secondaryBtn, { borderColor: theme.accent, backgroundColor: theme.primaryMuted }]}>
              <ThemedText style={{ color: theme.accent }}>Close</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  alphaButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  alphaButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  alphaHint: {
    fontSize: 12,
    opacity: 0.75,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  secondaryBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
});
