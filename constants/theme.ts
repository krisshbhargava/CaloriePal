export const Colors = {
  light: {
    text: '#1A1A2E',
    textMuted: '#6B7280',
    background: '#FAFBFF',
    surface: '#F1F3FB',
    card: '#FFFFFF',
    primary: '#6366F1',
    primaryMuted: '#EEF2FF',
    accent: '#4F46E5',
    cardBorder: '#E2E5F5',
    tint: '#6366F1',
    icon: '#1A1A2E',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#6366F1',
    link: '#6366F1',
    error: '#EF4444',
    errorSurface: '#FEF2F2',
    success: '#10B981',
    successSurface: '#ECFDF5',
  },
  dark: {
    text: '#E8E8F5',
    textMuted: '#9CA3AF',
    background: '#0F0F1A',
    surface: '#1A1A2E',
    card: '#16162A',
    primary: '#818CF8',
    primaryMuted: '#1E1B4B',
    accent: '#6366F1',
    cardBorder: '#2D2D4A',
    tint: '#818CF8',
    icon: '#E8E8F5',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#818CF8',
    link: '#818CF8',
    error: '#F87171',
    errorSurface: '#2D1B1B',
    success: '#34D399',
    successSurface: '#022C22',
  },
  macro: {
    calories: '#6366F1',
    protein: '#10B981',
    carbs: '#F59E0B',
    fat: '#F43F5E',
  },
};

export const Fonts = {
  regular: undefined as string | undefined,
  semiBold: undefined as string | undefined,
  bold: undefined as string | undefined,
  extraBold: undefined as string | undefined,
};

export const Layout = {
  maxContentWidth: 480,
  screenPadding: 20,
  cardPadding: 16,
  sectionGap: 20,
  borderRadiusSM: 12,
  borderRadiusMD: 20,
  borderRadiusLG: 28,
  borderRadiusFull: 999,
};

export const Shadows = {
  card: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  modal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
};
