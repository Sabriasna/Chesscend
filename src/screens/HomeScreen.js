import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { summarize, useApp } from '../context/AppContext';
import {
  AppHeader, Avatar, Badge, Card, Page, PillButton, ProgressBar, SectionHeader, T, Tile,
} from '../components/ui';
import { GoldScene } from '../components/GoldPiece';
import { ALL_LESSONS } from '../data/lessons';
import { PUZZLES } from '../data/puzzles';
import { QUICK, tcLabel } from '../data/timeControls';
import { AI_LEVELS } from '../engine/ai';
import { C, F } from '../theme/ui';

export default function HomeScreen({ nav }) {
  const { settings, stats, progress } = useApp();
  const s = summarize(stats);
  const nextLesson = ALL_LESSONS.find((l) => !progress.lessonsDone.includes(l.id));
  const lessonPct = Math.round((progress.lessonsDone.length / ALL_LESSONS.length) * 100);
  const nextPuzzle = PUZZLES.find((p) => !progress.puzzlesSolved.includes(p.id));

  return (
    <>
      <AppHeader onProfile={nav.profile} onBell={nav.bell} initial={settings.playerName.charAt(0).toUpperCase()} />
      <Page>
        <Text style={styles.tagline}>PLAY  •  LEARN  •  ASCEND</Text>
        <View style={styles.hero}>
          <GoldScene pieces={['n', 'k']} size={118} />
        </View>

        <Card onPress={() => nav.tab('ranking')} style={styles.player}>
          <Avatar name={settings.playerName} size={56} ring={C.goldLight} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={T.h3} numberOfLines={1}>{settings.playerName}</Text>
            <View style={styles.inline}>
              <Feather name="bar-chart-2" size={15} color={C.ink} />
              <Text style={styles.elo}>{stats.rating} rating</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.games}>
            <Text style={styles.gamesNum}>{s.played}</Text>
            <Text style={T.small}>games</Text>
          </View>
          <Feather name="chevron-right" size={22} color={C.ink} />
        </Card>

        {nav.saved ? (
          <Card onPress={nav.resume} style={styles.resume}>
            <MaterialCommunityIcons name="chess-queen" size={26} color={C.gold} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={T.h3}>Continue your game</Text>
              <Text style={T.small}>
                {nav.saved.config.mode === 'ai'
                  ? `vs Computer · ${AI_LEVELS[nav.saved.config.aiLevel].label}`
                  : 'vs Friend'}
                {' · '}
                {nav.saved.moves.length} moves · {tcLabel(nav.saved.config.timeControl)}
              </Text>
            </View>
            <Feather name="play-circle" size={30} color={C.ink} />
          </Card>
        ) : null}

        <PillButton label="Play now" icon="play" onPress={() => nav.quick(null)} style={{ marginTop: 14 }} />

        <View style={styles.tiles}>
          {Object.values(QUICK).map((q) => (
            <Tile key={q.label} icon={q.icon} mci={q.mci} label={q.label} sub={q.sub} onPress={() => nav.quick(q.tc)} />
          ))}
          <Tile icon="plus" label="Custom" onPress={() => nav.go({ name: 'setup', mode: 'ai' })} />
        </View>

        <SectionHeader title="Continue Learning" action="View all" onAction={() => nav.tab('learn')} />
        <Card
          onPress={() => (nextLesson ? nav.go({ name: 'lesson', lessonId: nextLesson.id }) : nav.tab('learn'))}
          style={styles.lesson}
        >
          <View style={styles.lessonArt}>
            <MaterialCommunityIcons name="school" size={34} color={C.goldDeep} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={T.h3} numberOfLines={1}>{nextLesson ? nextLesson.title : 'All lessons done!'}</Text>
            <Text style={T.small} numberOfLines={1}>
              {nextLesson ? `Lesson ${ALL_LESSONS.indexOf(nextLesson) + 1} of ${ALL_LESSONS.length}` : 'Great work'}
            </Text>
            <View style={styles.inline}>
              <ProgressBar value={lessonPct} style={{ flex: 1, marginRight: 10 }} />
              <Text style={styles.pct}>{lessonPct}%</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.puzzle} onPress={() => nav.go({ name: 'puzzles', startId: nextPuzzle?.id })}>
          <MaterialCommunityIcons name="puzzle" size={30} color={C.ink} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={T.h3}>Puzzle Challenge</Text>
            <Text style={T.small}>
              {progress.puzzlesSolved.length} / {PUZZLES.length} solved · Find the checkmate
            </Text>
          </View>
          {nextPuzzle ? (
            <PillButton label="Solve" size="m" onPress={() => nav.go({ name: 'puzzles', startId: nextPuzzle.id })} />
          ) : (
            <Badge label="All done" tone="green" />
          )}
        </Card>
      </Page>
    </>
  );
}

const styles = StyleSheet.create({
  tagline: { fontFamily: F.medium, fontSize: 13, letterSpacing: 4, color: C.ink, textAlign: 'center', marginTop: 6 },
  hero: { alignItems: 'center', marginTop: 8, marginBottom: -6, height: 150, justifyContent: 'flex-end' },
  player: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  elo: { fontFamily: F.medium, fontSize: 15, color: C.ink, marginTop: 2 },
  divider: { width: 1, height: 40, backgroundColor: C.cardBorder, marginHorizontal: 12 },
  games: { alignItems: 'center', backgroundColor: C.goldPale, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 14, marginRight: 6 },
  gamesNum: { fontFamily: F.bold, fontSize: 22, color: C.ink, lineHeight: 26, marginTop: 2 },
  resume: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  tiles: { flexDirection: 'row', gap: 10, marginTop: 14 },
  lesson: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  lessonArt: {
    width: 76, height: 76, borderRadius: 14, backgroundColor: C.goldPale, alignItems: 'center', justifyContent: 'center',
  },
  pct: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  puzzle: { flexDirection: 'row', alignItems: 'center', marginTop: 14, backgroundColor: C.goldPale },
});
