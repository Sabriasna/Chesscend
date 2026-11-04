import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { summarize, useApp } from '../context/AppContext';
import { AppHeader, Card, Hero, Page, PillButton, SectionHeader, T, Tile } from '../components/ui';
import { QUICK } from '../data/timeControls';
import { AI_LEVELS } from '../engine/ai';
import { C, F } from '../theme/ui';

export default function PlayScreen({ nav }) {
  const { settings, stats, updateSettings } = useApp();
  const s = summarize(stats);
  const level = settings.preferredLevel;

  return (
    <>
      <AppHeader onProfile={nav.profile} onBell={nav.bell} initial={settings.playerName.charAt(0).toUpperCase()} />
      <Page>
        <Hero title="Play" subtitle="Choose your game and challenge the computer or a friend." pieces={['p', 'n']} />

        <View style={styles.row}>
          {Object.values(QUICK).map((q) => (
            <Tile key={q.label} dark icon={q.icon} mci={q.mci} label={q.label} sub={q.sub} onPress={() => nav.quick(q.tc)} />
          ))}
        </View>

        <View style={[styles.row, { marginTop: 12 }]}>
          <Tile mci="sword-cross" label="Play a Friend" sub="Same device" onPress={() => nav.go({ name: 'setup', mode: 'local' })} />
          <Tile icon="users" label="Find Opponent" sub="Online" soon onPress={() => nav.soon('Online play')} />
          <Tile icon="sliders" label="Custom Game" sub="Your rules" onPress={() => nav.go({ name: 'setup', mode: 'ai' })} />
        </View>

        <Card style={styles.level}>
          <View style={styles.levelHead}>
            <MaterialCommunityIcons name="robot-outline" size={26} color={C.ink} />
            <Text style={[T.h3, { marginLeft: 10, flex: 1 }]}>Computer level</Text>
            <Text style={T.small}>for quick games</Text>
          </View>
          <View style={styles.levels}>
            {[1, 2, 3, 4].map((l) => (
              <Text
                key={l}
                onPress={() => updateSettings({ preferredLevel: l })}
                style={[styles.levelChip, l === level && styles.levelOn]}
              >
                {AI_LEVELS[l].label}
              </Text>
            ))}
          </View>
        </Card>

        <SectionHeader title="Your Ranking" action="View stats" onAction={() => nav.tab('ranking')} />
        <Card style={styles.rank}>
          <View style={styles.rankCell}>
            <MaterialCommunityIcons name="trophy-award" size={30} color={C.gold} />
            <Text style={T.num}>{s.wins}</Text>
            <Text style={T.small}>Wins</Text>
          </View>
          <View style={styles.sep} />
          <View style={styles.rankCell}>
            <Feather name="bar-chart-2" size={24} color={C.ink} />
            <Text style={T.num}>{stats.rating}</Text>
            <Text style={T.small}>Rating</Text>
          </View>
          <View style={styles.sep} />
          <View style={styles.rankCell}>
            <Feather name={s.week >= 0 ? 'trending-up' : 'trending-down'} size={24} color={s.week >= 0 ? C.gold : C.danger} />
            <Text style={T.num}>{s.week > 0 ? `+${s.week}` : s.week}</Text>
            <Text style={T.small}>This week</Text>
          </View>
        </Card>

        <PillButton label="Start a Game" icon="play" onPress={() => nav.quick(null)} style={{ marginTop: 18 }} />
      </Page>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  level: { marginTop: 14 },
  levelHead: { flexDirection: 'row', alignItems: 'center' },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  levelChip: {
    fontFamily: F.semibold, fontSize: 14, color: C.ink, backgroundColor: C.goldPale, paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 999, overflow: 'hidden',
  },
  levelOn: { backgroundColor: C.dark, color: C.onDark },
  rank: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18 },
  rankCell: { flex: 1, alignItems: 'center' },
  sep: { width: 1, height: 56, backgroundColor: C.cardBorder },
});
