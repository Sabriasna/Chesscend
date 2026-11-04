import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const FILLED = { k: '♚︎', q: '♛︎', r: '♜︎', b: '♝︎', n: '♞︎', p: '♟︎' };

/** Decorative golden chess piece (used in page headers). */
export default function GoldPiece({ type = 'n', size = 120, style, faded }) {
  const t = { fontSize: size, lineHeight: size * 1.1, width: size * 1.1, height: size * 1.15 };
  return (
    <View style={[{ width: t.width, height: t.height }, faded && { opacity: 0.35 }, style]} pointerEvents="none">
      {/* deep shadow layer */}
      <Text style={[styles.g, t, { color: '#8A5A0C', top: size * 0.035, left: size * 0.02 }]} allowFontScaling={false}>
        {FILLED[type]}
      </Text>
      {/* main gold */}
      <Text style={[styles.g, t, styles.glow, { color: '#E2AC3A' }]} allowFontScaling={false}>
        {FILLED[type]}
      </Text>
      {/* highlight */}
      <Text
        style={[styles.g, t, { color: '#FFE7A3', opacity: 0.55, top: -size * 0.02, left: -size * 0.015, transform: [{ scale: 0.96 }] }]}
        allowFontScaling={false}
      >
        {FILLED[type]}
      </Text>
    </View>
  );
}

/** Group of golden pieces on a faint board, like the header art of the mockups. */
export function GoldScene({ pieces = ['n', 'k'], size = 110 }) {
  return (
    <View style={styles.scene} pointerEvents="none">
      <View style={[styles.glowDisc, { width: size * 2.2, height: size * 0.5, borderRadius: size }]} />
      <View style={styles.row}>
        {pieces.map((p, i) => (
          <GoldPiece
            key={i}
            type={p}
            size={i === pieces.length - 1 ? size : size * 0.78}
            style={{ marginLeft: i === 0 ? 0 : -size * 0.28 }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  g: { position: 'absolute', top: 0, left: 0, textAlign: 'center', includeFontPadding: false },
  glow: { textShadowColor: 'rgba(176, 118, 20, 0.45)', textShadowOffset: { width: 0, height: 6 }, textShadowRadius: 12 },
  scene: { alignItems: 'center', justifyContent: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  glowDisc: { position: 'absolute', bottom: 0, backgroundColor: 'rgba(224, 168, 46, 0.28)' },
});
