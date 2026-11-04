import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { BOT_RATING, summarize, useApp } from '../context/AppContext';
import { AppHeader, Avatar, Badge, Card, Hero, Page, SectionHeader, Segmented, T } from '../components/ui';
import { AI_LEVELS } from '../engine/ai';
import { C, F } from '../theme/ui';

const REASONS = {
  checkmate: 'Checkmate', stalemate: 'Stalemate', threefold: 'Repetition', fifty: '50-move rule',
  material: 'Insufficient material', timeout: 'Time out', resign: 'Resignation',
};

export default function RankingScreen({ nav }) {
  const { settings, stats } = useApp();
  const [tab, setTab] = useState('me');
  const s = summarize(stats);
  const ai = stats.games.filter((g) => g.mode === 'ai');

  const record = [1, 2, 3, 4].map((l) => {
    const g = ai.filter((x) => x.level === l);
    return {
      level: l,
      wins: g.filter((x) => x.result === 'win').length,
      draws: g.filter((x) => x.result === 'draw').length,
      losses: g.filter((x) => x.result === 'loss').length,
    };
  });

  return (
    <>
      <AppHeader onProfile={nav.profile} onBell={nav.bell} initial={settings.playerName.charAt(0).toUpperCase()} />
      <Page>
        <Hero title="Ranking" subtitle="Track your progress game after game." pieces={['n', 'k']} size={92} />

        <Segmented
          items={[
            { key: 'me', label: 'My stats' },
            { key: 'global', label: 'Global', disabled: true },
            { key: 'friends', label: 'Friends', disabled: true },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Text style={[T.small, { textAlign: 'center', marginTop: 8 }]}>Global and friends rankings arrive with online play.</Text>

        <View style={styles.podium}>
          <PodiumStat value={s.wins} label="Wins" color={C.silver} icon="trophy-outline" />
          <View style={{ alignItems: 'center', marginHorizontal: 6 }}>
            <MaterialCommunityIcons name="crown" size={34} color={C.gold} />
            <View style={styles.laurel}>
              <MaterialCommunityIcons name="leaf" size={30} color={C.gold} style={{ transform: [{ rotate: '-50deg' }] }} />
              <Avatar name={settings.playerName} size={104} ring={C.gold} />
              <MaterialCommunityIcons name="leaf" size={30} color={C.gold} style={{ transform: [{ scaleX: -1 }, { rotate: '-50deg' }] }} />
            </View>
            <View style={[styles.base, { backgroundColor: C.gold, width: 96 }]}>
              <Text style={styles.baseText}>{stats.rating}</Text>
            </View>
            <Text style={[T.h3, { marginTop: 6 }]} numberOfLines={1}>{settings.playerName}</Text>
            <Text style={T.small}>Rating vs computer</Text>
          </View>
          <PodiumStat value={`${s.winRate}%`} label="Win rate" color={C.bronze} icon="percent-outline" />
        </View>

        <Card style={styles.totals}>
          <Total n={s.played} label="Games" />
          <Total n={s.wins} label="Wins" color={C.success} />
          <Total n={s.draws} label="Draws" />
          <Total n={s.losses} label="Losses" color={C.danger} />
        </Card>

        <SectionHeader title="Record vs Computer" />
        <Card style={{ paddingVertical: 4 }}>
          <View style={[styles.tr, styles.thead]}>
            <Text style={[styles.th, { flex: 1.6 }]}>Level</Text>
            <Text style={styles.th}>Rating</Text>
            <Text style={styles.th}>W</Text>
            <Text style={styles.th}>D</Text>
            <Text style={styles.th}>L</Text>
          </View>
          {record.map((r, i) => (
            <View key={r.level} style={[styles.tr, i < 3 && styles.trBorder]}>
              <View style={{ flex: 1.6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="robot-outline" size={20} color={C.ink} />
                <Text style={styles.td}>{AI_LEVELS[r.level].label}</Text>
              </View>
              <Text style={[styles.td, styles.c]}>{BOT_RATING[r.level]}</Text>
              <Text style={[styles.td, styles.c, { color: C.success }]}>{r.wins}</Text>
              <Text style={[styles.td, styles.c]}>{r.draws}</Text>
              <Text style={[styles.td, styles.c, { color: C.danger }]}>{r.losses}</Text>
            </View>
          ))}
        </Card>

        <SectionHeader title="Recent Games" />
        {stats.games.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: 26 }}>
            <MaterialCommunityIcons name="chess-pawn" size={34} color={C.faint} />
            <Text style={[T.body, { marginTop: 8, textAlign: 'center' }]}>No games yet. Play your first game!</Text>
          </Card>
        ) : (
          <Card style={{ paddingVertical: 4 }}>
            {stats.games.slice(0, 8).map((g, i, arr) => (
              <View key={g.date} style={[styles.tr, i < arr.length - 1 && styles.trBorder]}>
                <Feather
                  name={g.mode === 'ai' ? 'cpu' : 'users'}
                  size={18}
                  color={C.ink}
                  style={{ width: 28 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.td}>
                    {g.mode === 'ai' ? `vs ${AI_LEVELS[g.level]?.label ?? 'Computer'}` : 'Friend game'}
                  </Text>
                  <Text style={T.small}>{REASONS[g.reason] ?? ''} · {g.moves} moves</Text>
                </View>
                {g.mode === 'ai' ? (
                  <Badge
                    label={g.result === 'win' ? `Win  ▲ ${g.change}` : g.result === 'loss' ? `Loss  ▼ ${Math.abs(g.change)}` : `Draw  ${g.change >= 0 ? '+' : ''}${g.change}`}
                    tone={g.result === 'win' ? 'green' : g.result === 'loss' ? 'red' : 'gold'}
                  />
                ) : (
                  <Badge label={g.result === 'draw' ? 'Draw' : g.result === 'white' ? 'White won' : 'Black won'} />
                )}
              </View>
            ))}
          </Card>
        )}
      </Page>
    </>
  );
}

function PodiumStat({ value, label, color, icon }) {
  return (
    <View style={{ alignItems: 'center', flex: 1, marginTop: 40 }}>
      <View style={[styles.side, { borderColor: color }]}>
        <Text style={styles.sideValue}>{value}</Text>
      </View>
      <View style={[styles.base, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={18} color={C.ink} />
      </View>
      <Text style={[T.h3, { marginTop: 6 }]}>{label}</Text>
    </View>
  );
}

function Total({ n, label, color = C.ink }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[T.num, { color }]}>{n}</Text>
      <Text style={T.small}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  podium: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginTop: 18 },
  laurel: { flexDirection: 'row', alignItems: 'center' },
  side: {
    width: 84, height: 84, borderRadius: 42, borderWidth: 4, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
  },
  sideValue: { fontFamily: F.bold, fontSize: 24, color: C.ink, marginTop: 2 },
  base: { width: 64, height: 32, borderTopLeftRadius: 10, borderTopRightRadius: 10, marginTop: -6, alignItems: 'center', justifyContent: 'center' },
  baseText: { fontFamily: F.black, fontSize: 18, color: C.ink, marginTop: 2 },
  totals: { flexDirection: 'row', marginTop: 18 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  trBorder: { borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  thead: { borderBottomWidth: 1, borderBottomColor: C.cardBorder, paddingVertical: 10 },
  th: { flex: 1, fontFamily: F.medium, fontSize: 13, color: C.muted, textAlign: 'center' },
  td: { fontFamily: F.semibold, fontSize: 15, color: C.ink },
  c: { flex: 1, textAlign: 'center' },
});
