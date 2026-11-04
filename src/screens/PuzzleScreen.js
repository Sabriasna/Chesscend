import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import Board from '../components/Board';
import { PromotionModal } from '../components/Modals';
import { BackHeader, Badge, Card, Page, PillButton, T } from '../components/ui';
import { PUZZLES } from '../data/puzzles';
import { Position } from '../engine/chess';
import { C, F } from '../theme/ui';

export default function PuzzleScreen({ startId, nav }) {
  const { theme, settings, progress, markPuzzle } = useApp();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(Math.max(0, PUZZLES.findIndex((p) => p.id === startId)));
  const puzzle = PUZZLES[index];
  const [pos, setPos] = useState(() => new Position(puzzle.fen));
  const [selected, setSelected] = useState(null);
  const [state, setState] = useState('solving'); // solving | solved | wrong
  const [last, setLast] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [promo, setPromo] = useState(null);

  const toMove = new Position(puzzle.fen).turn;
  const targets = useMemo(
    () => (selected === null || state !== 'solving' ? [] : pos.movesFrom(selected).map((m) => m.to)),
    [selected, pos, state],
  );

  const load = (i) => {
    setIndex(i);
    setPos(new Position(PUZZLES[i].fen));
    setSelected(null);
    setState('solving');
    setLast(null);
    setShowHint(false);
  };

  const tryMove = (from, to, promotion) => {
    const legal = pos.legalMoves();
    const m = legal.find((x) => x.from === from && x.to === to && (!x.promotion || x.promotion === (promotion || 'q')));
    if (!m) return;
    const next = new Position(pos.fen());
    next.makeMove(m);
    const mate = next.inCheck() && next.legalMoves().length === 0;
    setPos(next);
    setLast({ from, to });
    setSelected(null);
    if (mate) {
      setState('solved');
      markPuzzle(puzzle.id);
      if (settings.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      setState('wrong');
      if (settings.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  const onSquarePress = (sq) => {
    if (state !== 'solving') return;
    if (selected !== null && targets.includes(sq)) {
      const isPromo = pos.legalMoves().some((m) => m.from === selected && m.to === sq && m.promotion);
      if (isPromo) setPromo({ from: selected, to: sq });
      else tryMove(selected, sq);
      return;
    }
    const p = pos.board[sq];
    setSelected(p && p.color === pos.turn && sq !== selected ? sq : null);
  };

  const boardSize = Math.min(width - 36, 460);
  const solvedCount = progress.puzzlesSolved.length;

  return (
    <>
      <BackHeader title={`Puzzle ${index + 1} / ${PUZZLES.length}`} onBack={nav.back} />
      <Page>
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{puzzle.title}</Text>
            <Text style={T.small}>
              {toMove === 'w' ? 'White' : 'Black'} to move · Checkmate in 1
            </Text>
          </View>
          {progress.puzzlesSolved.includes(puzzle.id) ? <Badge label="Solved" tone="green" /> : null}
        </View>

        <View style={{ alignItems: 'center', marginVertical: 14 }}>
          <Board
            board={pos.board}
            size={boardSize}
            theme={theme}
            orientation={toMove}
            selected={selected}
            targets={settings.showHints ? targets : []}
            lastMove={last}
            checkSquare={pos.inCheck() ? pos.findKing(pos.turn) : null}
            danger={[]}
            showCoordinates={settings.showCoordinates}
            onSquarePress={onSquarePress}
          />
        </View>

        {state === 'solving' && (
          <Card>
            <View style={styles.row}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color={C.goldDeep} />
              <Text style={[T.body, { flex: 1, marginLeft: 10 }]}>
                {showHint ? puzzle.hint : 'Find the move that checkmates the king.'}
              </Text>
            </View>
            {!showHint && (
              <PillButton label="Show a hint" variant="light" size="m" onPress={() => setShowHint(true)} style={{ marginTop: 12 }} />
            )}
          </Card>
        )}

        {state === 'solved' && (
          <Card style={{ backgroundColor: C.successBg }}>
            <View style={styles.row}>
              <Feather name="check-circle" size={26} color={C.success} />
              <Text style={[T.h3, { marginLeft: 10, flex: 1 }]}>Checkmate! Well done.</Text>
            </View>
            <Text style={[T.small, { marginTop: 6 }]}>{solvedCount} / {PUZZLES.length} puzzles solved</Text>
          </Card>
        )}

        {state === 'wrong' && (
          <Card style={{ backgroundColor: C.dangerBg }}>
            <View style={styles.row}>
              <Feather name="x-circle" size={26} color={C.danger} />
              <Text style={[T.h3, { marginLeft: 10, flex: 1 }]}>Not quite. The king can still escape.</Text>
            </View>
            <Text style={[T.small, { marginTop: 6 }]}>No worries, try again!</Text>
          </Card>
        )}

        <View style={styles.actions}>
          {state === 'wrong' && <PillButton label="Try again" icon="rotate-ccw" onPress={() => load(index)} style={{ flex: 1 }} />}
          {state !== 'wrong' && index > 0 && (
            <PillButton label="Previous" variant="light" size="m" onPress={() => load(index - 1)} style={{ flex: 1 }} />
          )}
          {state === 'solved' && index < PUZZLES.length - 1 && (
            <PillButton label="Next puzzle" icon="arrow-right" onPress={() => load(index + 1)} style={{ flex: 1.4 }} />
          )}
          {state === 'solving' && index < PUZZLES.length - 1 && (
            <PillButton label="Skip" variant="light" size="m" onPress={() => load(index + 1)} style={{ flex: 1 }} />
          )}
        </View>
      </Page>

      <PromotionModal
        visible={!!promo}
        color={pos.turn}
        theme={theme}
        onChoose={(p) => {
          tryMove(promo.from, promo.to, p);
          setPromo(null);
        }}
        onCancel={() => setPromo(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  title: { fontFamily: F.black, fontSize: 28, color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
