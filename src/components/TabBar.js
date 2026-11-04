import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../theme/ui';

export const TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'play', label: 'Play', icon: 'play' },
  { key: 'ranking', label: 'Ranking', icon: 'bar-chart-2' },
  { key: 'community', label: 'Community', icon: 'users' },
  { key: 'learn', label: 'Learn', icon: 'book-open' },
];

export default function TabBar({ active, onChange }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Pressable key={t.key} onPress={() => onChange(t.key)} style={styles.item} hitSlop={4}>
            <View style={[styles.iconWrap, on && styles.iconOn]}>
              <Feather name={t.icon} size={23} color={on ? C.onDark : C.ink} />
            </View>
            <Text style={[styles.label, on && { fontFamily: F.bold }]} numberOfLines={1}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFDF7',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(196, 146, 40, 0.15)',
  },
  item: { flex: 1, alignItems: 'center' },
  iconWrap: { width: 58, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: C.dark },
  label: { fontFamily: F.medium, fontSize: 12, color: C.ink, marginTop: 3 },
});
