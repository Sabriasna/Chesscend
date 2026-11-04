import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { C, F, radius, shadow } from '../theme/ui';
import { GoldScene } from './GoldPiece';

/** Cream & gold gradient background. */
export function Background({ children }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bgTop }}>
      <LinearGradient
        colors={[C.bgGlow, C.bgMid, C.bgTop]}
        locations={[0, 0.35, 1]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

export function Page({ children, scroll = true, contentStyle }) {
  if (!scroll) return <View style={[styles.page, contentStyle]}>{children}</View>;
  return (
    <ScrollView contentContainerStyle={[styles.page, contentStyle]} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

export function Logo({ size = 30 }) {
  return (
    <View style={styles.logo}>
      <MaterialCommunityIcons name="crown" size={size * 1.15} color={C.ink} />
      <Text style={[styles.logoText, { fontSize: size }]}>Chesscend</Text>
    </View>
  );
}

/** Top bar of every tab: profile, logo, notifications. */
export function AppHeader({ onProfile, onBell, initial = 'P' }) {
  return (
    <View style={styles.appHeader}>
      <Pressable onPress={onProfile} style={styles.roundBtn} hitSlop={8}>
        <Text style={styles.initial}>{initial}</Text>
      </Pressable>
      <Logo size={26} />
      <Pressable onPress={onBell} style={[styles.roundBtn, { backgroundColor: 'transparent' }]} hitSlop={8}>
        <Feather name="bell" size={24} color={C.ink} />
      </Pressable>
    </View>
  );
}

/** Header used by full-screen pages (game, lessons…). */
export function BackHeader({ title, onBack, right }) {
  return (
    <View style={styles.backHeader}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
        <Feather name="chevron-left" size={26} color={C.ink} />
      </Pressable>
      <Text style={styles.backTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ width: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

/** Big title + subtitle with golden pieces on the right. */
export function Hero({ title, subtitle, pieces = ['n'], size = 100 }) {
  return (
    <View style={styles.hero}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={styles.heroTitle}>{title}</Text>
        {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
      </View>
      <GoldScene pieces={pieces} size={size} />
    </View>
  );
}

export function Card({ children, style, onPress, disabled }) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.985 }], opacity: 0.92 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Black (default), gold or light pill button. */
export function PillButton({ label, icon, onPress, variant = 'dark', size = 'l', disabled, style }) {
  const bg = variant === 'dark' ? C.dark : variant === 'gold' ? C.gold : C.card;
  const fg = variant === 'light' ? C.ink : C.onDark;
  const big = size === 'l';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: bg, paddingVertical: big ? 17 : 10, paddingHorizontal: big ? 24 : 18, opacity: disabled ? 0.4 : 1 },
        variant === 'light' && { borderWidth: 1, borderColor: C.cardBorder },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={big ? 22 : 16} color={fg} /> : null}
      <Text style={[styles.pillText, { color: fg, fontSize: big ? 20 : 15 }]}>{label}</Text>
    </Pressable>
  );
}

/** Square tile with icon + label (+ small subtitle). */
export function Tile({ icon, mci, label, sub, onPress, dark, soon, style }) {
  const fg = dark ? C.onDark : C.ink;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        dark ? styles.tileDark : styles.card,
        { padding: 0 },
        pressed && { transform: [{ scale: 0.97 }] },
        soon && { opacity: 0.6 },
        style,
      ]}
    >
      {mci ? <MaterialCommunityIcons name={mci} size={30} color={fg} /> : <Feather name={icon} size={28} color={fg} />}
      <Text style={[styles.tileLabel, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
      {sub ? <Text style={[styles.tileSub, { color: dark ? '#E8E2D4' : C.inkSoft }]}>{sub}</Text> : null}
      {soon ? <Badge label="Soon" style={{ position: 'absolute', top: 8, right: 8 }} /> : null}
    </Pressable>
  );
}

export function Badge({ label, tone = 'gold', style }) {
  const map = {
    gold: [C.goldPale, C.goldDeep],
    green: [C.successBg, C.success],
    red: [C.dangerBg, C.danger],
    dark: [C.dark, C.onDark],
  };
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{action}</Text>
          <Feather name="chevron-right" size={18} color={C.ink} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Pill tabs: [{ key, label, disabled }] */
export function Segmented({ items, value, onChange, style }) {
  return (
    <View style={[styles.segment, style]}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Pressable
            key={it.key}
            disabled={it.disabled}
            onPress={() => onChange(it.key)}
            style={[styles.segItem, active && { backgroundColor: C.dark }]}
          >
            <Text style={[styles.segText, { color: active ? C.onDark : it.disabled ? C.faint : C.ink }]} numberOfLines={1}>
              {it.label}
            </Text>
            {it.disabled ? <Feather name="lock" size={11} color={C.faint} style={{ marginLeft: 4 }} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Avatar({ name = 'P', size = 52, ring }) {
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: C.dark, borderWidth: ring ? 3 : 0, borderColor: ring || 'transparent',
      }}
    >
      <Text style={{ color: C.goldLight, fontFamily: F.bold, fontSize: size * 0.42, marginTop: 2 }}>
        {(name || 'P').trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export function ProgressBar({ value, style }) {
  return (
    <View style={[styles.track, style]}>
      <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, value))}%` }]} />
    </View>
  );
}

export const T = StyleSheet.create({
  h1: { fontFamily: F.black, fontSize: 40, color: C.ink, letterSpacing: -0.5 },
  h2: { fontFamily: F.bold, fontSize: 22, color: C.ink },
  h3: { fontFamily: F.bold, fontSize: 17, color: C.ink },
  body: { fontFamily: F.regular, fontSize: 15, color: C.inkSoft, lineHeight: 22 },
  small: { fontFamily: F.medium, fontSize: 13, color: C.muted },
  num: { fontFamily: F.bold, fontSize: 26, color: C.ink },
});

const styles = StyleSheet.create({
  page: { paddingHorizontal: 18, paddingBottom: 28 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontFamily: F.bold, color: C.ink, letterSpacing: -0.3, marginTop: 3 },
  appHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 },
  roundBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.goldPale, alignItems: 'center', justifyContent: 'center',
  },
  initial: { fontFamily: F.bold, fontSize: 18, color: C.ink, marginTop: 2 },
  backHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 52 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, ...shadow },
  backTitle: { flex: 1, textAlign: 'center', fontFamily: F.bold, fontSize: 18, color: C.ink },
  hero: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4, marginBottom: 18, minHeight: 130 },
  heroTitle: { fontFamily: F.black, fontSize: 42, color: C.ink, letterSpacing: -0.8, lineHeight: 50 },
  heroSub: { fontFamily: F.regular, fontSize: 15, color: C.inkSoft, lineHeight: 22, marginTop: 4 },
  card: {
    backgroundColor: C.card, borderRadius: radius.m, borderWidth: 1, borderColor: C.cardBorder, padding: 16, ...shadow,
  },
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: radius.pill },
  pillText: { fontFamily: F.bold, marginTop: 2 },
  tile: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, minHeight: 104, borderRadius: radius.m },
  tileDark: { backgroundColor: C.dark, borderRadius: radius.l, minHeight: 130, ...shadow, shadowOpacity: 0.3 },
  tileLabel: { fontFamily: F.bold, fontSize: 15, marginTop: 8, paddingHorizontal: 4 },
  tileSub: { fontFamily: F.regular, fontSize: 13, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: { fontFamily: F.bold, fontSize: 11, marginTop: 1 },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 },
  sectionTitle: { fontFamily: F.bold, fontSize: 22, color: C.ink, letterSpacing: -0.3 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { fontFamily: F.semibold, fontSize: 14, color: C.ink, marginTop: 2 },
  segment: {
    flexDirection: 'row', backgroundColor: C.card, borderRadius: radius.pill, padding: 4, borderWidth: 1, borderColor: C.cardBorder,
  },
  segItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: radius.pill },
  segText: { fontFamily: F.semibold, fontSize: 14, marginTop: 2 },
  track: { height: 8, borderRadius: 4, backgroundColor: '#ECE3D0', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: C.dark },
});
