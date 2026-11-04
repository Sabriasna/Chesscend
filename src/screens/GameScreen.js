import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, } from 'react-native';
import * as Haptics from 'expo-haptics';
import Board from '../components/Board';
import Piece from '../components/Piece';
import { GameOverModal, PromotionModal } from '../components/Modals';
import { Header } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { AI_LEVELS, findBestMove } from '../engine/ai';
import { Game } from '../engine/chess';
import { clearSavedGame, saveGame } from '../storage/storage';
import { SERIF } from '../theme/themes';
const other = (c) => (c === 'w' ? 'b' : 'w');
const START_COUNT = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const initialClocksFor = (config) => config.timeControl ? { w: config.timeControl.minutes * 60000, b: config.timeControl.minutes * 60000 } : null;
export default function GameScreen({ config, initialMoves, initialClocks, onExit }) {
    const { theme, settings, update } = useSettings();
    const { width, height } = useWindowDimensions();
    // ---- État de la partie -------------------------------------------------
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
    const [override, setOverride] = useState(null); // abandon / temps écoulé
    const [thinking, setThinking] = useState(false);
    const [showEnd, setShowEnd] = useState(false);
    const [manualFlip, setManualFlip] = useState(false);
    const pos = game.pos;
    const turn = pos.turn;
    const result = override ?? game.result();
    const isAi = config.mode === 'ai';
    const humanTurn = !isAi || turn === config.playerColor;
    // ---- Orientation --------------------------------------------------------
    let orientation = 'w';
    if (isAi)
        orientation = config.playerColor;
    else if (settings.autoFlip)
        orientation = turn;
    else
        orientation = manualFlip ? 'b' : 'w';
    // ---- Sauvegarde automatique --------------------------------------------
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
        const sub = AppState.addEventListener('change', (s) => {
            if (s !== 'active')
                persist();
        });
        return () => sub.remove();
    }, [persist]);
    // ---- Pendule ------------------------------------------------------------
    const clockRunning = !!clocks && game.history.length > 0 && !result.over;
    useEffect(() => {
        if (!clockRunning)
            return;
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
    // ---- Après chaque coup -------------------------------------------------
    const afterMove = (entry) => {
        if (settings.haptics) {
            const style = entry.move.captured ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light;
            Haptics.impactAsync(style).catch(() => { });
        }
        if (config.timeControl && game.history.length > 1) {
            const inc = config.timeControl.increment * 1000;
            const mover = entry.move.color;
            setClocks((c) => (c ? { ...c, [mover]: c[mover] + inc } : c));
        }
        setSelected(null);
        bump();
        if (game.result().over)
            setTimeout(() => setShowEnd(true), 450);
    };
    // ---- Tour de l'ordinateur ----------------------------------------------
    useEffect(() => {
        if (!isAi || result.over || turn === config.playerColor)
            return;
        setThinking(true);
        const id = setTimeout(() => {
            const move = findBestMove(game.pos.fen(), config.aiLevel);
            if (move)
                afterMove(game.applyMove(move));
            setThinking(false);
        }, 350);
        return () => {
            clearTimeout(id);
            setThinking(false);
        };
    }, [version, result.over]); // eslint-disable-line react-hooks/exhaustive-deps
    // ---- Interaction --------------------------------------------------------
    const targets = useMemo(() => (selected === null ? [] : pos.movesFrom(selected).map((m) => m.to)), [selected, version]);
    const onSquarePress = (sq) => {
        if (result.over || thinking || !humanTurn)
            return;
        const piece = pos.board[sq];
        if (selected !== null && targets.includes(sq)) {
            if (game.isPromotion(selected, sq)) {
                setPendingPromo({ from: selected, to: sq });
                return;
            }
            const entry = game.play(selected, sq);
            if (entry)
                afterMove(entry);
            return;
        }
        if (piece && piece.color === turn && sq !== selected)
            setSelected(sq);
        else
            setSelected(null);
    };
    const choosePromotion = (p) => {
        if (!pendingPromo)
            return;
        const entry = game.play(pendingPromo.from, pendingPromo.to, p);
        setPendingPromo(null);
        if (entry)
            afterMove(entry);
    };
    const canUndo = !thinking &&
        game.history.length > 0 &&
        (!isAi || game.history.length >= (config.playerColor === 'w' ? 1 : 2));
    const undo = () => {
        if (!canUndo)
            return;
        game.undo();
        if (isAi && game.pos.turn !== config.playerColor)
            game.undo();
        setOverride(null);
        setShowEnd(false);
        setSelected(null);
        bump();
    };
    const resign = () => {
        const loser = isAi ? config.playerColor : turn;
        Alert.alert('Abandonner ?', 'La partie sera perdue.', [
            { text: 'Continuer', style: 'cancel' },
            {
                text: 'Abandonner',
                style: 'destructive',
                onPress: () => {
                    setOverride({ over: true, winner: other(loser), reason: 'resign' });
                    setSelected(null);
                    setShowEnd(true);
                },
            },
        ]);
    };
    const replay = () => {
        gameRef.current = new Game();
        setClocks(initialClocksFor(config));
        setOverride(null);
        setShowEnd(false);
        setSelected(null);
        setPendingPromo(null);
        clearSavedGame();
        bump();
    };
    // ---- Aide aux coups -----------------------------------------------------
    const hints = settings.showHints;
    const danger = useMemo(() => {
        if (!hints || result.over || !humanTurn)
            return [];
        const us = turn;
        const out = [];
        pos.board.forEach((p, i) => {
            if (p && p.color === us && p.type !== 'k' && pos.isAttacked(i, other(us)) && !pos.isAttacked(i, us))
                out.push(i);
        });
        return out;
    }, [hints, version, result.over, humanTurn]); // eslint-disable-line react-hooks/exhaustive-deps
    const checkSquare = pos.inCheck() ? pos.findKing(turn) : null;
    const last = game.lastMove();
    // ---- Pièces capturées ---------------------------------------------------
    const captured = useMemo(() => {
        const count = {
            w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
            b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
        };
        pos.board.forEach((p) => p && count[p.color][p.type]++);
        const lost = (c) => {
            const list = [];
            ['q', 'r', 'b', 'n', 'p'].forEach((t) => {
                // Les promotions peuvent donner « plus » que le départ : on borne à 0.
                for (let i = 0; i < Math.max(0, START_COUNT[t] - count[c][t]); i++)
                    list.push(t);
            });
            return list;
        };
        const material = (c) => Object.keys(count[c]).reduce((s, t) => s + VALUE[t] * count[c][t], 0);
        return { byWhite: lost('b'), byBlack: lost('w'), diff: material('w') - material('b') };
    }, [version]); // eslint-disable-line react-hooks/exhaustive-deps
    // ---- Textes -------------------------------------------------------------
    const nameOf = (c) => {
        if (isAi)
            return c === config.playerColor ? 'Vous' : `Ordinateur · ${AI_LEVELS[config.aiLevel].label}`;
        return c === 'w' ? 'Blancs' : 'Noirs';
    };
    let status = '';
    if (result.over)
        status = 'Partie terminée';
    else if (thinking)
        status = "L'ordinateur réfléchit…";
    else if (pos.inCheck())
        status = `Échec ! ${isAi ? (humanTurn ? 'À vous de jouer' : '') : `Au tour des ${nameOf(turn)}`}`;
    else
        status = isAi ? (humanTurn ? 'À vous de jouer' : '') : `Au tour des ${nameOf(turn)}`;
    const endText = (() => {
        if (!result.over)
            return { title: '', subtitle: '' };
        const reasons = {
            checkmate: 'Échec et mat',
            stalemate: 'Pat',
            threefold: 'Triple répétition',
            fifty: 'Règle des 50 coups',
            material: 'Matériel insuffisant',
            timeout: 'Temps écoulé',
            resign: 'Abandon',
        };
        let title = 'Partie nulle';
        if (result.winner) {
            if (isAi)
                title = result.winner === config.playerColor ? 'Victoire !' : 'Défaite';
            else
                title = result.winner === 'w' ? 'Les Blancs gagnent' : 'Les Noirs gagnent';
        }
        return { title, subtitle: reasons[result.reason] };
    })();
    // ---- Mise en page -------------------------------------------------------
    const boardSize = Math.floor(Math.min(width - 20, height * 0.56, 560));
    const top = other(orientation);
    const bottom = orientation;
    const moves = game.sanList();
    return (<View style={{ flex: 1 }}>
      <Header title={isAi ? 'Contre l’ordinateur' : 'Deux joueurs'} onBack={() => {
            persist();
            onExit();
        }}/>

      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <PlayerBar theme={theme} name={nameOf(top)} color={top} captured={top === 'w' ? captured.byWhite : captured.byBlack} advantage={top === 'w' ? captured.diff : -captured.diff} clock={clocks ? clocks[top] : null} active={!result.over && turn === top} width={boardSize}/>

        <Board board={pos.board} size={boardSize} theme={theme} orientation={orientation} selected={selected} targets={hints ? targets : []} lastMove={last} checkSquare={checkSquare} danger={danger} showCoordinates={settings.showCoordinates} onSquarePress={onSquarePress}/>

        <PlayerBar theme={theme} name={nameOf(bottom)} color={bottom} captured={bottom === 'w' ? captured.byWhite : captured.byBlack} advantage={bottom === 'w' ? captured.diff : -captured.diff} clock={clocks ? clocks[bottom] : null} active={!result.over && turn === bottom} width={boardSize}/>

        <Text style={[styles.status, { color: pos.inCheck() && !result.over ? theme.danger : theme.textMuted }]}>
          {status || ' '}
        </Text>

        <MoveList moves={moves} theme={theme} width={boardSize}/>

        <View style={[styles.actions, { width: boardSize }]}>
          <Action theme={theme} icon="↶" label="Annuler" onPress={undo} disabled={!canUndo}/>
          <Action theme={theme} icon="💡" label={hints ? 'Aide : oui' : 'Aide : non'} active={hints} onPress={() => update({ showHints: !hints })}/>
          {!isAi && !settings.autoFlip && (<Action theme={theme} icon="⇅" label="Retourner" onPress={() => setManualFlip((f) => !f)}/>)}
          {result.over ? (<Action theme={theme} icon="↻" label="Rejouer" onPress={replay}/>) : (<Action theme={theme} icon="⚑" label="Abandon" onPress={resign} disabled={game.history.length === 0}/>)}
        </View>
      </ScrollView>

      <PromotionModal visible={!!pendingPromo} color={turn} onChoose={choosePromotion} onCancel={() => setPendingPromo(null)}/>
      <GameOverModal visible={showEnd && result.over} title={endText.title} subtitle={endText.subtitle} onReplay={replay} onClose={() => setShowEnd(false)} onMenu={onExit}/>
    </View>);
}
/* ------------------------------------------------------------------------ */
function formatClock(ms) {
    if (ms < 10000)
        return (Math.ceil(ms / 100) / 10).toFixed(1);
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}
function PlayerBar({ theme, name, color, captured, advantage, clock, active, width, }) {
    const low = clock !== null && clock < 20000;
    return (<View style={[styles.player, { width }]}>
      <View style={[
            styles.avatar,
            { backgroundColor: color === 'w' ? theme.whitePiece : theme.blackPiece, borderColor: active ? theme.accent : 'transparent' },
        ]}/>
      <View style={{ flex: 1 }}>
        <Text style={[styles.playerName, { color: theme.text }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.capturedRow}>
          {captured.map((t, i) => (<View key={i} style={{ marginRight: -7 }}>
              <Piece type={t} color={other(color)} size={18} theme={theme}/>
            </View>))}
          {advantage > 0 && (<Text style={{ color: theme.textMuted, fontSize: 12, marginLeft: 10, fontWeight: '700' }}>+{advantage}</Text>)}
        </View>
      </View>
      {clock !== null && (<View style={[
                styles.clock,
                {
                    backgroundColor: active ? (low ? '#C0392B' : theme.accent) : theme.surface,
                },
            ]}>
          <Text style={[
                styles.clockText,
                { color: active ? (low ? '#fff' : theme.accentText) : theme.textMuted },
            ]}>
            {formatClock(clock)}
          </Text>
        </View>)}
    </View>);
}
function MoveList({ moves, theme, width }) {
    const ref = useRef(null);
    const pairs = [];
    for (let i = 0; i < moves.length; i += 2)
        pairs.push({ n: i / 2 + 1, w: moves[i], b: moves[i + 1] });
    return (<View style={[styles.moves, { width, backgroundColor: theme.surface }]}>
      {pairs.length === 0 ? (<Text style={{ color: theme.textMuted, fontSize: 14, paddingHorizontal: 12 }}>Aucun coup joué</Text>) : (<ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} onContentSizeChange={() => ref.current?.scrollToEnd({ animated: true })} contentContainerStyle={{ paddingHorizontal: 10, alignItems: 'center' }}>
          {pairs.map((p, idx) => {
                const isLastPair = idx === pairs.length - 1;
                return (<View key={p.n} style={styles.pair}>
                <Text style={[styles.moveNum, { color: theme.textMuted }]}>{p.n}.</Text>
                <Text style={[
                        styles.move,
                        { color: theme.text },
                        isLastPair && !p.b && { color: theme.accent },
                    ]}>
                  {p.w}
                </Text>
                {p.b && (<Text style={[styles.move, { color: isLastPair ? theme.accent : theme.text }]}>{p.b}</Text>)}
              </View>);
            })}
        </ScrollView>)}
    </View>);
}
function Action({ theme, icon, label, onPress, disabled, active, }) {
    return (<Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [
            styles.action,
            {
                backgroundColor: active ? theme.accent : theme.surface,
                opacity: disabled ? 0.35 : pressed ? 0.75 : 1,
            },
        ]}>
      <Text style={{ fontSize: 18, color: active ? theme.accentText : theme.text }}>{icon}</Text>
      <Text style={{ fontSize: 11, fontWeight: '700', color: active ? theme.accentText : theme.text, marginTop: 2 }}>
        {label}
      </Text>
    </Pressable>);
}
const styles = StyleSheet.create({
    content: { alignItems: 'center', paddingBottom: 30 },
    player: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
    avatar: { width: 34, height: 34, borderRadius: 9, borderWidth: 2.5 },
    playerName: { fontSize: 16, fontWeight: '700', fontFamily: SERIF },
    capturedRow: { flexDirection: 'row', alignItems: 'center', height: 20, marginTop: 1 },
    clock: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10, minWidth: 82, alignItems: 'center' },
    clockText: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
    status: { fontSize: 14, fontWeight: '600', marginTop: 2, marginBottom: 8 },
    moves: { height: 44, borderRadius: 12, justifyContent: 'center' },
    pair: { flexDirection: 'row', alignItems: 'baseline', marginRight: 14, gap: 6 },
    moveNum: { fontSize: 13, fontWeight: '600' },
    move: { fontSize: 15, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
    action: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12 },
});
