import { useState } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  shadowColor?: string;
};

export function RaisedPressable({ style, shadowColor = '#6366F1', children, ...props }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        typeof style === 'function' ? style({ pressed }) : style,
        {
          shadowColor,
          shadowOffset: { width: 0, height: pressed ? 1 : hovered ? 6 : 4 },
          shadowOpacity: pressed ? 0.1 : hovered ? 0.3 : 0.22,
          shadowRadius: pressed ? 3 : hovered ? 10 : 8,
          elevation: pressed ? 2 : hovered ? 8 : 6,
          transform: [{ translateY: pressed ? 2 : hovered ? -1 : 0 }],
        },
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
}
