import {
  BarChart2,
  Calendar,
  ChevronRight,
  Code,
  Home,
  MessageCircle,
  Send,
  ShieldCheck,
} from 'lucide-react-native';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { OpaqueColorValue, type StyleProp, type ViewStyle } from 'react-native';

const ICON_MAP = {
  'house.fill': Home,
  'message.fill': MessageCircle,
  'chart.bar.fill': BarChart2,
  'calendar': Calendar,
  'shield.fill': ShieldCheck,
  'paperplane.fill': Send,
  'chevron.left.forwardslash.chevron.right': Code,
  'chevron.right': ChevronRight,
} as const;

type IconSymbolName = keyof typeof ICON_MAP;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon size={size} color={color as string} style={style as any} />;
}
