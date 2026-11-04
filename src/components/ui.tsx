import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { SERIF } from '../theme/themes';

export function Button({
  label, onPress, variant = 'primary', icon, disabled, style, small,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: string;
  disabled?: boolean;
  style?: ViewStyle;
  small?: boolean;
}) {
  const { theme } = useSettings();
  const bg = variant === 'primary' ? theme.accent : variant === 'secondary' ? theme.surface : 'transparent';
  const fg = variant === 'primary' ? theme.accentText : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        {
          backgroundColor: bg,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
          borderColor: variant === 'ghost' ? theme.textMuted : 'transparent',
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {icon ? <Text style={[styles.icon, { color: fg }, small && { fontSize: 16 }]}>{icon}</Text> : null}
      <Text style={[styles.label, { color: fg }, small && { fontSize: 14 }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useSettings();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.accent : theme.surface,
          borderColor: active ? theme.accent : 'rgba(255,255,255,0.08)',
        },
      ]}
    >
      <Text style={{ color: active ? theme.accentText : theme.text, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const { theme } = useSettings();
  return <Text style={[styles.section, { color: theme.textMuted }]}>{children.toUpperCase()}</Text>;
}

export function Header({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  const { theme } = useSettings();
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={{ color: theme.text, fontSize: 30, lineHeight: 32 }}>‹</Text>
          </Pressable>
        )}
      </View>
      <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  buttonSmall: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, gap: 6 },
  icon: { fontSize: 20 },
  label: { fontSize: 17, fontWeight: '700' },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginTop: 22, marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52 },
  headerSide: { width: 70 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontFamily: SERIF, fontWeight: '600' },
});
