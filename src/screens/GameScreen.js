import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import Board from '../components/Board';
import Piece from '../components/Piece';
import { ConfirmModal, GameOverModal, PromotionModal } from '../components/Modals';
import { Avatar, BackHeader } from '../components/ui';
import { AI_LEVELS, findBestMove } from '../engine/ai';
import { Game } from '../engine/chess';
import { coachMessage, findThreats } from '../engine/coach';
import { clearSavedGame, saveGame } from '../storage/storage';
import { tcLabel } from '../data/timeControls';
import { C, F, radius, shadow } from '../theme/ui';

const other = (c) => (c === 'w' ? 'b' : 'w');
const START_COUNT = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const REASONS = {
  checkmate: 'by checkmate',
  stalemate: 'Stalemate: no legal move, but no check',
  threefold: 'Same position three times',
  fifty: '50 moves without a capture or pawn move',
  material: 'Not enough pieces left to checkmate',
  timeout: 'on time',
  resign: 'by resignation',
};

const initialClocksFor = (config) =>
  config.timeControl ? { w: config.timeControl.minutes * 60000, b: config.timeControl.minutes * 60000 } : null;

export default function GameScreen({ config, initialMoves, initialClocks, nav }) {
  const { theme, settings, updateSettings, recordGame } = useApp();
  const { width, height } = useWindowDimensions();

  // ---- Game state ---------------------------------------------------------
  const gameRef = useRef(null);
  if (!gameRef.current) {
    const g = new Game();
    initialMoves?.forEach((s) => g.playSan(s));
    gameRef.current = g;
  }
  const game = gameRef.current;

  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  const [selected, setSelected] = useState(null);
  const [pendingPromo, setPendingPromo] = useState(null);
  const [clocks, setClocks] = useState(initialClocks ?? initialClocksFor(config));
  const clocksRef = useRef(clocks);
  clocksRef.current = clocks;
  const [override, setOverride] = useState(null); // resignation / time out
  const [thinking, setThinking] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [manualFlip, setManualFlip] = useState(false);
  const [askResign, setAskResign] = useState(false);
  const recorded = useRef(false);

  const pos = game.pos;
  const turn = pos.turn;
  const result = override ?? game.result();
  const isAi = config.mode === 'ai';
  const humanTurn = !isAi || turn === config.playerColor;

  let orientation = 'w';
  if (isAi) orientation = config.playerColor;
  else if (settings.autoFlip) orientation = turn;
  else orientation = manualFlip ? 'b' : 'w';

  // ---- Auto-save ----------------------------------------------------------
  const persist = useCallback(() => {
    if (result.over || game.history.length === 0) {
      clearSavedGame();
      return;
    }
    saveGame({ config, moves: game.sanList(), clocks: clocksRef.current, savedAt: Date.now() });
  }, [config, game, result.over]);

  useEffect(() => {
    persist();
  }, [version, override]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && persist());
    return () => sub.remove();
  }, [persist]);

  // ---- Record finished games ---------------------------------------------
  useEffect(() => {
    if (!result.over || recorded.current) return;
    recorded.current = true;
    let r;
    if (isAi) r = result.winner === null ? 'draw' : result.winner === config.playerColor ? 'win' : 'loss';
    else r = result.winner === null ? 'draw' : result.winner === 'w' ? 'white' : 'black';
    recordGame({ result: r, mode: config.mode, level: config.aiLevel, reason: result.reason, moves: Math.ceil(game.history.length / 2) });
  }, [result.over]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Clock --------------------------------------------------------------
  const clockRunning = !!clocks && game.history.length > 0 && !result.over;
  useEffect(() => {
    if (!clockRunning) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      setClocks((c) => (c ? { ...c, [turn]: Math.max(0, c[turn] - dt) } : c));
    }, 100);
    return () => clearInterval(id);
  }, [clockRunning, turn]);

  useEffect(() => {
    if (clocks && !result.over && clocks[turn] <= 0) {
      setOverride({ over: true, winner: other(turn), reason: 'timeout' });
      setSelected(null);
      setShowEnd(true);
    }
  }, [clocks, turn, result.over]);

  // ---- After each move ----------------------------------------------------
  const afterMove = (entry) => {
    if (settings.haptics) {
      const style = entry.move.captured ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light;
      Haptics.impactAsync(style).catch(() => {});
    }
    if (config.timeControl && game.history.length > 1) {
      const inc = config.timeControl.increment * 1000;
      const mover = entry.move.color;
      setClocks((c) => (c ? { ...c, [mover]: c[mover] + inc } : c));
    }
    setSelected(null);
    bump();
    if (game.result().over) setTimeout(() => setShowEnd(true), 450);
  };

  // ---- Computer's turn ----------------------------------------------------
  useEffect(() => {
    if (!isAi || result.over || turn === config.playerColor) return;
    setThinking(true);
    const id = setTimeout(() => {
      const move = findBestMove(game.pos.fen(), config.aiLevel);
      if (move) afterMove(game.applyMove(move));
      setThinking(false);
    }, 350);
    return () => {
      clearTimeout(id);
      setThinking(false);
    };
  }, [version, result.over]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Interaction --------------------------------------------------------
  const targets = useMemo(
    () => (selected === null ? [] : pos.movesFrom(selected).map((m) => m.to)),
    [selected, version], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const onSquarePress = (sq) => {
    if (result.over || thinking || !humanTurn) return;
    const piece = pos.board[sq];
    if (selected !== null && targets.includes(sq)) {
      if (game.isPromotion(selected, sq)) {
        setPendingPromo({ from: selected, to: sq });
        return;
      }
      const entry = game.play(selected, sq);
      if (entry) afterMove(entry);
      return;
    }
    if (piece && piece.color === turn && sq !== selected) setSelected(sq);
    else setSelected(null);
  };

  const choosePromotion = (p) => {
    if (!pendingPromo) return;
    const entry = game.play(pendingPromo.from, pendingPromo.to, p);
    setPendingPromo(null);
    if (entry) afterMove(entry);
  };

  const canUndo =
    !thinking && !override && game.history.length > 0 && (!isAi || game.history.length >= (config.playerColor === 'w' ? 1 : 2));

  const undo = () => {
    if (!canUndo) return;
    game.undo();
    if (isAi && game.pos.turn !== config.playerColor) game.undo();
    setShowEnd(false);
    setSelected(null);
    bump();
  };

  const resign = () => {
    const loser = isAi ? config.playerColor : turn;
    setAskResign(false);
    setOverride({ over: true, winner: other(loser), reason: 'resign' });
    setSelected(null);
    setShowEnd(true);
  };

  const replay = () => {
    gameRef.current = new Game();
    recorded.current = false;
    setClocks(initialClocksFor(config));
    setOverride(null);
    setShowEnd(false);
    setSelected(null);
    setPendingPromo(null);
    clearSavedGame();
    bump();
  };

  // ---- Hints & coach ------------------------------------------------------
  const hints = settings.showHints;
  const threats = useMemo(
    () => (!hints || result.over || !humanTurn ? [] : findThreats(pos, turn)),
    [hints, version, result.over, humanTurn], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const danger = threats.map((t) => t.square);

  const coach = useMemo(() => {
    if (!hints || result.over) return null;
    if (thinking) return { icon: 'robot-outline', text: 'The computer is thinking…' };
    if (!humanTurn) return null;
    const names = isAi
      ? { you: 'you', your: 'your', opponent: 'The computer' }
      : turn === 'w'
        ? { you: 'White', your: "White's", opponent: 'Black' }
        : { you: 'Black', your: "Black's", opponent: 'White' };
    return coachMessage(game, threats, names);
  }, [hints, version, result.over, thinking, humanTurn, threats]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkSquare = pos.inCheck() ? pos.findKing(turn) : null;
  const last = game.lastMove();

  // ---- Captured pieces ----------------------------------------------------
  const captured = useMemo(() => {
    const count = { w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } };
    pos.board.forEach((p) => p && count[p.color][p.type]++);
    const lost = (c) => {
      const list = [];
      ['q', 'r', 'b', 'n', 'p'].forEach((t) => {
        for (let i = 0; i < Math.max(0, START_COUNT[t] - count[c][t]); i++) list.push(t);
      });
      return list;
    };
    const material = (c) => Object.keys(count[c]).reduce((s, t) => s + VALUE[t] * count[c][t], 0);
    return { byWhite: lost('b'), byBlack: lost('w'), diff: material('w') - material('b') };
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Texts --------------------------------------------------------------
  const nameOf = (c) => {
    if (isAi) return c === config.playerColor ? settings.playerName : 'Computer';
    return c === 'w' ? 'White' : 'Black';
  };
  const subOf = (c) => {
    if (isAi) return c === config.playerColor ? (c === 'w' ? 'White' : 'Black') : AI_LEVELS[config.aiLevel].label;
    return 'Friend';
  };

  const endText = (() => {
    if (!result.over) return { title: '', subtitle: '' };
    let title = 'Draw';
    if (result.winner) {
      if (isAi) title = result.winner === config.playerColor ? 'You won!' : 'You lost';
      else title = result.winner === 'w' ? 'White wins!' : 'Black wins!';
    }
    let subtitle = REASONS[result.reason];
    if (result.winner && isAi && result.winner !== config.playerColor) subtitle += '. Every game makes you better!';
    return { title, subtitle };
  })();

  // ---- Layout -------------------------------------------------------------
  const boardSize = Math.floor(Math.min(width - 24, height * 0.52, 560));
  const top = other(orientation);
  const bottom = orientation;
  const moves = game.sanList();

  return (
    <View style={{ flex: 1 }}>
      <BackHeader
        title={isAi ? `vs Computer · ${AI_LEVELS[config.aiLevel].label}` : 'Friend game'}
        onBack={() => {
          persist();
          nav.back();
        }}
        right={config.timeControl ? <Text style={styles.tc}>{tcLabel(config.timeControl)}</Text> : null}
      />

      <ScrollView contentContainerStyle={styles.content} bounces={false} showsVerticalScrollIndicator={false}>
        <PlayerBar
          theme={theme}
          name={nameOf(top)}
          sub={subOf(top)}
          color={top}
          isComputer={isAi && top !== config.playerColor}
          captured={top === 'w' ? captured.byWhite : captured.byBlack}
          advantage={top === 'w' ? captured.diff : -captured.diff}
          clock={clocks ? clocks[top] : null}
          active={!result.over && turn === top}
          width={boardSize}
        />

        <Board
          board={pos.board}
          size={boardSize}
          theme={theme}
          orientation={orientation}
          selected={selected}
          targets={hints ? targets : []}
          lastMove={last}
          checkSquare={checkSquare}
          danger={danger}
          showCoordinates={settings.showCoordinates}
          onSquarePress={onSquarePress}
        />

        <PlayerBar
          theme={theme}
          name={nameOf(bottom)}
          sub={subOf(bottom)}
          color={bottom}
          isComputer={isAi && bottom !== config.playerColor}
          captured={bottom === 'w' ? captured.byWhite : captured.byBlack}
          advantage={bottom === 'w' ? captured.diff : -captured.diff}
          clock={clocks ? clocks[bottom] : null}
          active={!result.over && turn === bottom}
          width={boardSize}
        />

        {coach ? (
          <View
            style={[
              styles.coach,
              { width: boardSize },
              coach.tone === 'red' && { backgroundColor: C.dangerBg },
              coach.tone === 'orange' && { backgroundColor: '#FDEBD5' },
            ]}
          >
            <View style={styles.coachIcon}>
              <MaterialCommunityIcons name={coach.icon || 'school'} size={20} color={C.goldLight} />
            </View>
            <Text style={styles.coachText}>{coach.text}</Text>
          </View>
        ) : result.over ? (
          <Text style={styles.status}>{endText.title} · {endText.subtitle}</Text>
        ) : !hints && !humanTurn ? (
          <Text style={styles.status}>The computer is thinking…</Text>
        ) : null}

        <MoveList moves={moves} width={boardSize} />

        <View style={[styles.actions, { width: boardSize }]}>
          <Action icon="rotate-ccw" label="Undo" onPress={undo} disabled={!canUndo} />
          <Action icon="zap" label={hints ? 'Hints on' : 'Hints off'} active={hints} onPress={() => updateSettings({ showHints: !hints })} />
          {!isAi && !settings.autoFlip && <Action icon="refresh-cw" label="Flip" onPress={() => setManualFlip((f) => !f)} />}
          {result.over ? (
            <Action icon="play" label="New game" onPress={replay} />
          ) : (
            <Action icon="flag" label="Resign" onPress={() => setAskResign(true)} disabled={game.history.length === 0} />
          )}
        </View>
      </ScrollView>

      <PromotionModal
        visible={!!pendingPromo}
        color={turn}
        theme={theme}
        onChoose={choosePromotion}
        onCancel={() => setPendingPromo(null)}
      />
      <ConfirmModal
        visible={askResign}
        title="Resign this game?"
        text={isAi ? 'The computer will win this game.' : `${turn === 'w' ? 'White' : 'Black'} resigns and ${turn === 'w' ? 'Black' : 'White'} wins.`}
        confirm="Resign"
        cancel="Keep playing"
        onConfirm={resign}
        onCancel={() => setAskResign(false)}
      />
      <GameOverModal
        visible={showEnd && result.over}
        title={endText.title}
        subtitle={endText.subtitle}
        onReplay={replay}
        onClose={() => setShowEnd(false)}
        onMenu={nav.back}
      />
    </View>
  );
}

/* ------------------------------------------------------------------------ */

function formatClock(ms) {
  if (ms < 10000) return (Math.ceil(ms / 100) / 10).toFixed(1);
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function PlayerBar({ theme, name, sub, color, isComputer, captured, advantage, clock, active, width }) {
  const low = clock !== null && clock < 20000;
  return (
    <View style={[styles.player, { width }]}>
      {isComputer ? (
        <View style={[styles.bot, active && { borderColor: C.gold }]}>
          <MaterialCommunityIcons name="robot-outline" size={24} color={C.goldLight} />
        </View>
      ) : (
        <Avatar name={name} size={40} ring={active ? C.gold : null} />
      )}
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.playerName} numberOfLines={1}>
          {name} <Text style={styles.playerSub}>· {sub}</Text>
        </Text>
        <View style={styles.capturedRow}>
          {captured.map((t, i) => (
            <View key={i} style={{ marginRight: -7 }}>
              <Piece type={t} color={color === 'w' ? 'b' : 'w'} size={18} theme={theme} />
            </View>
          ))}
          {advantage > 0 && <Text style={styles.adv}>+{advantage}</Text>}
        </View>
      </View>
      {clock !== null && (
        <View style={[styles.clock, active && { backgroundColor: low ? C.danger : C.dark }]}>
          <Text style={[styles.clockText, active && { color: C.onDark }]}>{formatClock(clock)}</Text>
        </View>
      )}
    </View>
  );
}

function MoveList({ moves, width }) {
  const ref = useRef(null);
  const pairs = [];
  for (let i = 0; i < moves.length; i += 2) pairs.push({ n: i / 2 + 1, w: moves[i], b: moves[i + 1] });
  return (
    <View style={[styles.moves, { width }]}>
      {pairs.length === 0 ? (
        <Text style={styles.noMoves}>No moves yet</Text>
      ) : (
        <ScrollView
          ref={ref}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => ref.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={{ paddingHorizontal: 12, alignItems: 'center' }}
        >
          {pairs.map((p, idx) => {
            const lastPair = idx === pairs.length - 1;
            return (
              <View key={p.n} style={styles.pair}>
                <Text style={styles.moveNum}>{p.n}.</Text>
                <Text style={[styles.move, lastPair && !p.b && styles.moveLast]}>{p.w}</Text>
                {p.b ? <Text style={[styles.move, lastPair && styles.moveLast]}>{p.b}</Text> : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function Action({ icon, label, onPress, disabled, active }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.action,
        active && { backgroundColor: C.dark },
        { opacity: disabled ? 0.35 : pressed ? 0.8 : 1 },
      ]}
    >
      <Feather name={icon} size={20} color={active ? C.goldLight : C.ink} />
      <Text style={[styles.actionText, active && { color: C.onDark }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingBottom: 30 },
  tc: { fontFamily: F.semibold, fontSize: 12, color: C.muted },
  player: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  bot: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'transparent',
  },
  playerName: { fontFamily: F.bold, fontSize: 16, color: C.ink },
  playerSub: { fontFamily: F.regular, fontSize: 13, color: C.muted },
  capturedRow: { flexDirection: 'row', alignItems: 'center', height: 20 },
  adv: { fontFamily: F.bold, fontSize: 12, color: C.muted, marginLeft: 12 },
  clock: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 12, minWidth: 84, alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder },
  clockText: { fontFamily: F.bold, fontSize: 21, color: C.muted, fontVariant: ['tabular-nums'], marginTop: 2 },
  coach: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.goldPale, borderRadius: radius.m, padding: 12, marginBottom: 10, marginTop: 2,
  },
  coachIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  coachText: { flex: 1, fontFamily: F.medium, fontSize: 14, color: C.ink, lineHeight: 20 },
  status: { fontFamily: F.semibold, fontSize: 14, color: C.muted, marginBottom: 10, marginTop: 2, textAlign: 'center' },
  moves: { height: 46, borderRadius: radius.m, justifyContent: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder },
  noMoves: { fontFamily: F.regular, fontSize: 14, color: C.muted, paddingHorizontal: 14 },
  pair: { flexDirection: 'row', alignItems: 'baseline', marginRight: 14, gap: 6 },
  moveNum: { fontFamily: F.medium, fontSize: 13, color: C.muted },
  move: { fontFamily: F.semibold, fontSize: 15, color: C.ink },
  moveLast: { color: C.goldDeep, fontFamily: F.bold },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  action: {
    flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.s, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.cardBorder, ...shadow, shadowOpacity: 0.08,
  },
  actionText: { fontFamily: F.semibold, fontSize: 12, color: C.ink, marginTop: 4 },
});
