import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { summarize, useApp } from '../context/AppContext';
import { AppHeader, Badge, Card, Hero, Page, PillButton, ProgressBar, SectionHeader, T, Tile } from '../components/ui';
import GoldPiece from '../components/GoldPiece';
import { ALL_LESSONS, COURSES } from '../data/lessons';
import { PUZZLES } from '../data/puzzles';
import { C, F } from '../theme/ui';

const SOON_COURSES = [
  { title: 'Tactical Patterns', level: 'Intermediate', piece: 'n' },
  { title: 'Endgame Mastery', level: 'Advanced', piece: 'k' },
];

export default function LearnScreen({ nav }) {
  const { settings, progress, stats } = useApp();
  const done = progress.lessonsDone;
  const next = ALL_LESSONS.find((l) => !done.includes(l.id));
  const course = next ? COURSES.find((c) => c.id === next.courseId) : COURSES[0];
  const courseDone = course.lessons.filter((l) => done.includes(l.id)).length;
  const pct = Math.round((courseDone / course.lessons.length) * 100);
  const s = summarize(stats);
  const nextPuzzle = PUZZLES.find((p) => !progress.puzzlesSolved.includes(p.id));

  return (
    <>
      <AppHeader onProfile={nav.profile} onBell={nav.bell} initial={settings.playerName.charAt(0).toUpperCase()} />
      <Page>
        <Hero title="Learn" subtitle="Improve your game with simple lessons, puzzles and friendly tips." pieces={['b', 'n']} />

        <View style={styles.row}>
          <Tile mci="school-outline" label="Courses" onPress={() => nav.go({ name: 'course', courseId: course.id })} />
          <Tile mci="puzzle-outline" label="Puzzles" onPress={() => nav.go({ name: 'puzzles', startId: nextPuzzle?.id })} />
          <Tile icon="bar-chart-2" label="Analysis" soon onPress={() => nav.soon('Game analysis')} />
          <Tile icon="play-circle" label="Videos" soon onPress={() => nav.soon('Videos')} />
        </View>

        <SectionHeader title="Continue Learning" action="View all" onAction={() => nav.go({ name: 'course', courseId: course.id })} />
        <Card
          style={styles.continue}
          onPress={() => (next ? nav.go({ name: 'lesson', lessonId: next.id }) : nav.go({ name: 'course', courseId: course.id }))}
        >
          <View style={styles.thumb}>
            <GoldPiece type="k" size={64} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={T.h3} numberOfLines={1}>{course.title}</Text>
            <Text style={T.small} numberOfLines={1}>
              {next ? `Lesson ${course.lessons.indexOf(next) + 1} · ${next.title}` : 'Course completed'}
            </Text>
            <View style={styles.inline}>
              <ProgressBar value={pct} style={{ flex: 1, marginRight: 10 }} />
              <Text style={styles.pct}>{pct}%</Text>
            </View>
          </View>
          <View style={styles.playBtn}>
            <Feather name="play" size={20} color={C.onDark} style={{ marginLeft: 3 }} />
          </View>
        </Card>

        <SectionHeader title="Courses" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 6, paddingBottom: 8 }} style={{ marginHorizontal: -2 }}>
          {COURSES.map((c) => {
            const n = c.lessons.filter((l) => done.includes(l.id)).length;
            return (
              <CourseCard
                key={c.id}
                title={c.title}
                level={c.level}
                piece={c.id === 'basics' ? 'p' : 'q'}
                footer={`${n}/${c.lessons.length} lessons`}
                onPress={() => nav.go({ name: 'course', courseId: c.id })}
              />
            );
          })}
          {SOON_COURSES.map((c) => (
            <CourseCard key={c.title} title={c.title} level={c.level} piece={c.piece} soon onPress={() => nav.soon(c.title)} />
          ))}
        </ScrollView>

        <Card style={styles.progress}>
          <MaterialCommunityIcons name="chart-bar" size={36} color={C.ink} />
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={T.h3}>Track Your Progress</Text>
            <Text style={T.small}>
              {done.length} lessons · {progress.puzzlesSolved.length} puzzles · {s.wins} wins
            </Text>
          </View>
          <PillButton label="My Progress" size="m" onPress={() => nav.tab('ranking')} />
        </Card>
      </Page>
    </>
  );
}

function CourseCard({ title, level, piece, footer, soon, onPress }) {
  return (
    <Card onPress={onPress} style={[styles.course, soon && { opacity: 0.7 }]}>
      <View style={styles.courseArt}>
        <GoldPiece type={piece} size={70} />
        {soon ? <Badge label="Soon" tone="dark" style={{ position: 'absolute', top: 8, right: 8 }} /> : null}
      </View>
      <View style={{ padding: 12 }}>
        <Text style={[T.h3, { fontSize: 16 }]} numberOfLines={2}>{title}</Text>
        <View style={[styles.inline, { marginTop: 6 }]}>
          <Feather name="bar-chart" size={14} color={C.inkSoft} />
          <Text style={T.small}>{level}</Text>
        </View>
        {footer ? <Text style={[T.small, { marginTop: 2, color: C.goldDeep }]}>{footer}</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  continue: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  thumb: { width: 92, height: 92, borderRadius: 14, backgroundColor: '#3A2A12', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  pct: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  playBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  course: { width: 160, padding: 0, overflow: 'hidden' },
  courseArt: { height: 100, backgroundColor: '#3A2A12', alignItems: 'center', justifyContent: 'center' },
  progress: { flexDirection: 'row', alignItems: 'center', marginTop: 18, backgroundColor: C.goldPale },
});
