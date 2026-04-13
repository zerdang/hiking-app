// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

/**
 * Add your icon mappings here (Material Icons names).
 * Browse available icons at https://icons.expo.fyi — filter by MaterialIcons.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'map.fill': 'map',
  'camera.fill': 'photo-camera',
  'magnifyingglass': 'search',
  'list.fill': 'list',
  'list.bullet.rectangle.fill': 'format-list-bulleted',
} as const satisfies Record<string, ComponentProps<typeof MaterialIcons>['name']>;

type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;

}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
