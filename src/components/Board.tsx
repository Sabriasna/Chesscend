import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Color, Piece as PieceT } from '../engine/chess';
import { fileOf, rowOf } from '../engine/chess';
import type { Theme } from '../theme/themes';
import Piece from './Piece';

interface Props {
  board: (PieceT | null)[];
  size: number;
  theme: Theme;
  orientation: Color; // couleur affichée en bas
  selected: number | null;
  targets: number[]; // cases d'arrivée possibles (aide aux coups)
  lastMove: { from: number; to: number } | null;
  checkSquare: number | null;
  danger: number[]; // pièces en prise (aide aux coups)
  showCoordinates: boolean;
  onSquarePress: (sq: number) => void;
}

const FILES = 'abcdefgh';

export default function Board({
  board, size, theme, orientation, selected, targets, lastMove, checkSquare, danger,
  showCoordinates, onSquarePress,
}: Props) {
  const frame = Math.max(6, Math.round(size * 0.022));
  const inner = size - frame * 2;
  const sq = inner / 8;

  const rows = [];
  for (let vr = 0; vr < 8; vr++) {
    const cells = [];
    for (let vf = 0; vf < 8; vf++) {
      // Retourne l'échiquier si les Noirs sont en bas
      const index = orientation === 'w' ? vr * 8 + vf : (7 - vr) * 8 + (7 - vf);
      const piece = board[index];
      const isLight = (fileOf(index) + rowOf(index)) % 2 === 0;
      const isTarget = targets.includes(index);
      const isLast = !!lastMove && (lastMove.from === index || lastMove.to === index);
      const coordColor = isLight ? theme.dark : theme.light;

      cells.push(
        <Pressable
          key={index}
          onPress={() => onSquarePress(index)}
          style={{ width: sq, height: sq, backgroundColor: isLight ? theme.light : theme.dark }}
        >
          {isLast && <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.lastMove }]} />}
          {selected === index && <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.selected }]} />}
          {checkSquare === index && (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: theme.check, borderRadius: sq / 2, transform: [{ scale: 0.95 }] },
              ]}
            />
          )}
          {danger.includes(index) && (
            <View
              style={[
                StyleSheet.absoluteFill,
                { borderWidth: Math.max(2, sq * 0.06), borderColor: theme.danger, borderRadius: sq * 0.12, margin: 1 },
              ]}
            />
          )}

          {showCoordinates && vf === 0 && (
            <Text style={[styles.coord, styles.coordRank, { color: coordColor, fontSize: sq * 0.2 }]}>
              {8 - rowOf(index)}
            </Text>
          )}
          {showCoordinates && vr === 7 && (
            <Text style={[styles.coord, styles.coordFile, { color: coordColor, fontSize: sq * 0.2 }]}>
              {FILES[fileOf(index)]}
            </Text>
          )}

          {piece && <Piece type={piece.type} color={piece.color} size={sq} theme={theme} />}

          {isTarget &&
            (piece ? (
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  { borderWidth: sq * 0.08, borderColor: theme.hint, borderRadius: sq / 2 },
                ]}
              />
            ) : (
              <View pointerEvents="none" style={styles.center}>
                <View
                  style={{ width: sq * 0.3, height: sq * 0.3, borderRadius: sq * 0.15, backgroundColor: theme.hint }}
                />
              </View>
            ))}
        </Pressable>,
      );
    }
    rows.push(
      <View key={vr} style={styles.row}>
        {cells}
      </View>,
    );
  }

  return (
    <View
      style={[
        styles.frame,
        { width: size, height: size, padding: frame, backgroundColor: theme.frame, borderRadius: frame * 1.2 },
      ]}
    >
      <View style={{ borderRadius: 3, overflow: 'hidden' }}>{rows}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  row: { flexDirection: 'row' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  coord: { position: 'absolute', fontWeight: '700', opacity: 0.9 },
  coordRank: { top: 2, left: 3 },
  coordFile: { bottom: 1, right: 4 },
});
